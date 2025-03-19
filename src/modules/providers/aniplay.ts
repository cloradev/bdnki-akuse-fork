import 'dotenv/config';

import axios from 'axios';
import {
  UnifiedMediaResult,
  UnifiedSources,
} from 'sofamaxxing.ts/dist/models/unifiedTypes';
import OriginalAniPlay from 'sofamaxxing.ts/dist/providers/AniPlay';

import ProviderCache from './cache';

// Create a custom axios interceptor for the global axios instance
axios.interceptors.request.use((config) => {
  // List of headers that browsers don't allow to be set via XHR
  const unsafeHeaders = ['user-agent', 'connection', 'referer', 'origin', 'host'];

  // If headers exist, filter out the unsafe ones
  if (config.headers) {
    unsafeHeaders.forEach(header => {
      if (config.headers[header] !== undefined) {
        delete config.headers[header];
      }

      // Check for case variations as well (e.g., User-Agent)
      const headerCased = header.replace(/\b\w/g, l => l.toUpperCase());
      if (config.headers[headerCased] !== undefined) {
        delete config.headers[headerCased];
      }
    });
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Create a proxy to intercept third-party library's Axios usage
// This enables us to cancel headers before they reach the browser's XHR
function createSafeAxiosProxy() {
  // Store original Axios methods
  const originalCreate = axios.create;

  // Override axios.create to return a patched instance
  axios.create = function(...args) {
    const instance = originalCreate.apply(this, args);

    // Add the same interceptor to any new axios instance
    instance.interceptors.request.use((config) => {
      const unsafeHeaders = ['user-agent', 'connection', 'referer', 'origin', 'host'];

      if (config.headers) {
        unsafeHeaders.forEach(header => {
          // Check lowercase and case-sensitive versions
          if (config.headers[header] !== undefined) {
            delete config.headers[header];
          }

          const headerCased = header.replace(/\b\w/g, l => l.toUpperCase());
          if (config.headers[headerCased] !== undefined) {
            delete config.headers[headerCased];
          }
        });
      }

      return config;
    });

    return instance;
  };
}

// Apply the proxy before creating any instances
createSafeAxiosProxy();

// Create a safe wrapper around the original AniPlay class
class SafeAniPlay extends OriginalAniPlay {
  constructor() {
    super();
    // No need to modify constructor
  }

  // Override methods that make network requests
  async search(query: string) {
    try {
      return await super.search(query);
    } catch (error) {
      // Log and rethrow for better debugging
      console.error('Error in SafeAniPlay.search:', error);
      throw error;
    }
  }

  async fetchInfo(id: string) {
    try {
      return await super.fetchInfo(id);
    } catch (error) {
      console.error('Error in SafeAniPlay.fetchInfo:', error);
      throw error;
    }
  }

  async fetchSources(
    id: string,
    host?: "maze" | "pahe" | "yuki" | undefined,
    type?: "sub" | "dub" | undefined,
    proxy?: boolean | undefined
  ): Promise<UnifiedSources> {
    try {
      return await super.fetchSources(id, host, type, proxy);
    } catch (error) {
      console.error('Error in SafeAniPlay.fetchSources:', error);
      throw error;
    }
  }
}

// Use the safe version instead of the original
const api = new SafeAniPlay();
const cache = new ProviderCache();

// Helper function for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let retries = 0;
  let lastError: any = null;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      const isRateLimitError = error.message?.includes('429') ||
                             (error.response && error.response.status === 429);
      const isNetworkError = error.message?.includes('network') ||
                           error.message?.includes('timeout') ||
                           (error.response && error.response.status >= 500);

      // Retry on rate limits and network/server errors
      if (isRateLimitError || isNetworkError) {
        retries++;
        if (retries > maxRetries) {
          console.warn(`Max retries (${maxRetries}) exceeded for operation:`, error.message || error);
          throw error;
        }

        const backoffTime = initialDelay * Math.pow(2, retries - 1);
        const errorType = isRateLimitError ? 'rate limited' : 'server error';
        console.log(`Got ${errorType}, retrying in ${backoffTime}ms (attempt ${retries}/${maxRetries})`);
        await delay(backoffTime);
      } else {
        // Don't retry on other errors (e.g., 4xx client errors)
        console.warn('Non-retryable error:', error.message || error);
        throw error;
      }
    }
  }
}

class AniPlayAPI {
  searchInProvider = async (
    query: string,
    dubbed: boolean,
  ): Promise<UnifiedMediaResult[] | null> => {
    try {
      const searchResults = await retryWithBackoff(() => api.search(query));
      return searchResults.results;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  /**
   *
   * @returns animeId from provider
   */
  searchMatchInProvider = async (
    animeTitles: string[],
    index: number,
    dubbed: boolean,
    releaseDate: number,
  ): Promise<UnifiedMediaResult | null> => {
    try {
      // start searching
      for (const animeSearch of animeTitles) {
        // search anime (per dub too) with retry logic
        const searchResults = await retryWithBackoff(() => api.search(animeSearch));

        // find the best result: first check for same name,
        // then check for same release date.
        // finally, update cache
        const animeResult =
          searchResults.results.filter(
            (result: any) =>
              result.title.toLowerCase().trim() ==
                animeSearch.toLowerCase().trim() ||
              result.releaseDate == releaseDate.toString(),
          )[index] ?? null;

        if (animeResult) return animeResult;
      }

      return null;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  getEpisodeSource = async (
    animeId: string,
    episode: number,
    host: 'maze' | 'pahe' | 'yuki',
    dubbed: boolean,
  ): Promise<UnifiedSources | null> => {
    try {
      const mediaInfo = await retryWithBackoff(() => api.fetchInfo(animeId));

      const episodeId =
        mediaInfo?.episodes?.find((ep: any) => ep.number == episode)?.id ??
        null;

      if (episodeId) {
        const sources = await retryWithBackoff(() => api.fetchSources(
          episodeId,
          host,
          dubbed ? 'dub' : 'sub',
          host === 'maze' || host === 'pahe',
        ));
        console.log(sources);
        return sources;
      }

      return null;
    } catch (error) {
      console.log(error);
      return null;
    }
  };
}

export default AniPlayAPI;
