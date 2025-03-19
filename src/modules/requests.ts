import axios from 'axios';
import Store from 'electron-store';

// Rate limiting
const MAX_REQUESTS = 90; // AniList API rate limit
let remainingRequests = MAX_REQUESTS;
let resetTime = 0;
let lockUntil = 0;

// Define RequestQueueItem type
interface RequestQueueItem {
  method: string;
  url: string;
  headers: any;
  data: any;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  priority: number;
  useCache: boolean;
  cacheKey: string;
}

// Cache for storing API responses
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const PRIORITY_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for important data
const STORE = new Store();

// Request queue and processing
const requestQueue: RequestQueueItem[] = [];
let isProcessingQueue = false;

const delay = async (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

// Critical endpoints that should be throttled more aggressively
const CRITICAL_ENDPOINTS = [
  'Viewer',
  'MediaListCollection',
  'User(id:',
];

/**
 * Prioritizes requests to ensure critical data is loaded first
 * @param url The request URL
 * @param options The request options/data
 * @returns A priority score (lower means higher priority)
 */
const getPriorityScore = (url: string, options: any): number => {
  if (url !== 'https://graphql.anilist.co') return 0;

  const optionsStr = typeof options === 'string' ? options : JSON.stringify(options);

  // Higher priority (lower number) for essential user data
  if (optionsStr.includes('Viewer') || optionsStr.includes('User(id:')) return 1;

  // Medium priority for current list and history related data
  if (optionsStr.includes('MediaListCollection') || optionsStr.includes('CURRENT')) return 2;

  // Medium-low priority for trending/popular anime
  if (optionsStr.includes('TRENDING_DESC') || optionsStr.includes('POPULARITY_DESC')) return 3;

  // Lower priority for everything else
  return 4;
};

/**
 * Determines if a request should be throttled more aggressively
 * @param options The request options/data
 * @returns Whether the request should be throttled
 */
const shouldThrottleRequest = (options: any): boolean => {
  const optionsStr = typeof options === 'string' ? options : JSON.stringify(options);
  return CRITICAL_ENDPOINTS.some(endpoint => optionsStr.includes(endpoint));
};

/**
 * Handles rate limiting by implementing a smarter delay strategy
 */
const handleRateLimiting = async (current: number, options: any) => {
  if (current < lockUntil) {
    // We're in a lock period after hitting rate limit
    await delay(lockUntil - current);
    return;
  }

  if (current >= resetTime) {
    // Reset the counter if we've passed the reset time
    remainingRequests = MAX_REQUESTS;
    return;
  }

  // Additional throttling for critical endpoints
  if (shouldThrottleRequest(options)) {
    // More aggressive throttling for important requests
    await delay(0.5); // Add a small delay to prevent overloading
  }

  if (remainingRequests <= 5) {
    // Approaching rate limit, slow down to avoid 429s
    const timeUntilReset = Math.max(1, resetTime - current);
    const delayTime = Math.min(3, timeUntilReset / 6); // Distribute remaining requests
    await delay(delayTime);
  } else if (remainingRequests <= 0) {
    // At rate limit, wait until reset
    await delay(Math.max(1, resetTime - current));
  }
};

/**
 * Parse response headers to track rate limiting information
 */
const handleResponseHeaders = (headers: any) => {
  if (headers['x-ratelimit-remaining'] !== undefined) {
    remainingRequests = parseInt(headers['x-ratelimit-remaining']);
  }

  if (headers['x-ratelimit-reset'] !== undefined) {
    resetTime = parseInt(headers['x-ratelimit-reset']);
  }
};

/**
 * Process the request queue in an ordered fashion
 */
const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;

  isProcessingQueue = true;

  try {
    // Sort the queue by priority
    requestQueue.sort((a, b) => a.priority - b.priority);

    while (requestQueue.length > 0) {
      const request = requestQueue.shift();

      // Skip if request is undefined (shouldn't happen, but TypeScript needs this check)
      if (!request) continue;

      try {
        // Check if a valid cache entry exists
        if (request.useCache && cache.has(request.cacheKey)) {
          // We can safely use non-null assertion here because we've checked with cache.has()
          const cachedData = cache.get(request.cacheKey)!;
          if (Date.now() < cachedData.expiry) {
            request.resolve(cachedData.data);
            continue;
          }
          // Remove expired cache entry
          cache.delete(request.cacheKey);
        }

        // Handle rate limiting before making the request
        const current = Date.now() / 1000;
        await handleRateLimiting(current, request.data);

        // Make the actual request
        const response = await axios({
          method: request.method,
          url: request.url,
          headers: request.headers,
          data: request.data,
        });

        // Update rate limit information
        if (request.url === 'https://graphql.anilist.co') {
          handleResponseHeaders(response.headers);
        }

        // Cache the response if caching is enabled
        if (request.useCache) {
          const cacheDuration = request.priority <= 2 ? PRIORITY_CACHE_DURATION : CACHE_DURATION;
          cache.set(request.cacheKey, {
            data: response.data,
            expiry: Date.now() + cacheDuration
          });
        }

        request.resolve(response.data);
      } catch (error) {
        let response = (error as { response?: { status: number, headers: { [key: string]: any } } }).response;

        if (response && response.status === 429) {
          // Handle rate limiting error
          const retryAfter = parseInt(response.headers['retry-after'] || '60');
          lockUntil = (Date.now() / 1000) + retryAfter;

          // Put the request back in the queue
          requestQueue.unshift(request);

          // Add a delay before continuing
          await delay(retryAfter);
        } else {
          request.reject(error);
        }
      }

      // Small delay between requests to avoid overwhelming the API
      await delay(0.1);
    }
  } finally {
    isProcessingQueue = false;

    // If more requests were added while processing, process them
    if (requestQueue.length > 0) {
      processQueue();
    }
  }
};

/**
 * Builds the data options for the request
 *
 * @param {*} query
 * @param {*} variables
 * @returns object with the data options
 */
export const getOptions = (query: any = {}, variables: any = {}) => {
  return JSON.stringify({
    query: query,
    variables: variables,
  });
};

/**
 * Makes a Promise based HTTP request with Axios
 *
 * @param {*} method
 * @param {*} url
 * @param {*} headers
 * @param {*} options
 * @param {Object} config Additional configuration options
 * @returns object with the fetched data
 * @throws error if the request was not successful
 */
export const makeRequest = async (
  method: 'GET' | 'POST' | string,
  url: string,
  headers: any = {},
  options: any = {},
  config: {
    timeout?: number,
    cache?: boolean,
    cacheKey?: string,
    retries?: number
  } = {}
): Promise<any> => {
  // Set defaults for config
  const {
    timeout = 30000,
    cache: useCustomCache = false,
    cacheKey: customCacheKey = '',
    retries = 0
  } = config;

  // Only apply advanced handling for AniList API requests or if custom cache is specified
  const cachingEnabled = STORE.get('enable_caching') !== false;
  const shouldUseCache = cachingEnabled && (url === 'https://graphql.anilist.co' || useCustomCache);

  // Generate cache key from the request details or use provided custom key
  const cacheKey = customCacheKey || `${method}:${url}:${JSON.stringify(options)}`;

  // For non-queue mode, check cache first for immediate return
  if (shouldUseCache && cache.has(cacheKey)) {
    const cachedData = cache.get(cacheKey)!;
    if (Date.now() < cachedData.expiry) {
      return cachedData.data;
    }
    cache.delete(cacheKey);
  }

  // For AniList API, use the queue system for rate limiting
  if (url === 'https://graphql.anilist.co') {
    // Determine the priority of this request
    const priority = getPriorityScore(url, options);

    // Queue the request and return a promise
    return new Promise((resolve, reject) => {
      requestQueue.push({
        method,
        url,
        headers,
        data: options,
        resolve,
        reject,
        priority,
        useCache: shouldUseCache,
        cacheKey,
      });

      // Start processing the queue if it's not already being processed
      if (!isProcessingQueue) {
        processQueue();
      }
    });
  } else {
    // Direct request for other APIs
    try {
      let lastError;
      let retryCount = 0;

      // Add retry logic
      while (retryCount <= retries) {
        try {
          const response = await axios({
            method,
            url,
            headers,
            data: options,
            timeout: timeout
          });

          // Cache the response if caching is enabled
          if (shouldUseCache) {
            const cacheDuration = config.cache ? PRIORITY_CACHE_DURATION : CACHE_DURATION;
            cache.set(cacheKey, {
              data: response.data,
              expiry: Date.now() + cacheDuration
            });
          }

          return response.data;
        } catch (error: any) {
          lastError = error;

          // Don't retry 4xx errors (except 429) as they are client errors
          if (error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {
            break;
          }

          retryCount++;
          if (retryCount <= retries) {
            // Exponential backoff: 1s, 2s, 4s, etc.
            const backoffTime = Math.pow(2, retryCount - 1) * 1000;
            await delay(backoffTime / 1000);
          }
        }
      }

      throw lastError;
    } catch (error: any) {
      throw error;
    }
  }
};
