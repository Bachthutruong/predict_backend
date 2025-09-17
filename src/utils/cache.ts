// Cache utility for managing prediction cache across different routes

// Simple in-memory cache for active predictions (5 minutes)
let activePredictionsCache: any = null;
let cacheTimestamp: number = 0;
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCache = () => ({
  cache: activePredictionsCache,
  timestamp: cacheTimestamp,
  isExpired: () => {
    const now = Date.now();
    return !activePredictionsCache || (now - cacheTimestamp) >= CACHE_DURATION;
  }
});

export const setCache = (data: any) => {
  activePredictionsCache = data;
  cacheTimestamp = Date.now();
};

export const clearCache = () => {
  activePredictionsCache = null;
  cacheTimestamp = 0;
};

export const isCacheValid = () => {
  const now = Date.now();
  return activePredictionsCache && (now - cacheTimestamp) < CACHE_DURATION;
};
