import { skip } from "node:test";
import { SkipEvent, SkipEventTypes } from "../types/aniskipTypes";
import { makeRequest } from "./requests";

const AniSkip = {
  baseUrl: "https://api.aniskip.com/",
  getSkipEvents: async function(
    malId: number,
    episodeNumber: number,
    episodeLength: number = 0
  ) {
    try {
      // Add a cache key to prevent hammering the API
      const cacheKey = `aniskip-${malId}-${episodeNumber}-${Math.floor(episodeLength)}`;

      // Try to make the request with built-in error handling
      const data = await makeRequest(
        'GET',
        `${this.baseUrl}v2/skip-times/${malId}/${episodeNumber}?types=op&types=ed&types=recap&episodeLength=${Math.floor(episodeLength)}`,
        {}, // No custom headers
        {}, // No body
        {
          timeout: 5000, // 5 second timeout
          cache: true,
          cacheKey: cacheKey,
          retries: 1 // Only retry once
        }
      ).catch(error => {
        console.warn(`AniSkip API error for anime ${malId}, episode ${episodeNumber}: ${error.message || error}`);
        return { found: false };
      });

      if(!data.found)
        return [];

      return data.results as SkipEvent[];
    } catch (error) {
      console.warn(`Unexpected error in AniSkip.getSkipEvents: ${error}`);
      return [];
    }
  },
  getCurrentEvent: function(
    time: number,
    skipEvents: SkipEvent[],
  ) {
    if(!skipEvents || skipEvents.length === 0)
      return;

    for(const skipEvent of skipEvents) {
      const interval = skipEvent.interval;

      if(interval.startTime <= time && interval.endTime > time)
        return skipEvent
    }
  },
  getEventName: function(
    skipEvent: SkipEvent
  ) {
    for(const [name, value] of Object.entries(SkipEventTypes)) {
      if(value !== skipEvent.skipType)
        continue;

      return name;
    }
  }
}

export default AniSkip;
