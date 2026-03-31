// Cache utility for managing prediction cache across different routes

// Simple in-memory cache for active predictions (5 minutes), isolated per language
type CacheBucket = {
  data: any;
  timestamp: number;
};

const predictionCacheByLanguage: Record<string, CacheBucket> = {};
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCache = (lang: string = 'vi') => ({
  cache: predictionCacheByLanguage[lang]?.data ?? null,
  timestamp: predictionCacheByLanguage[lang]?.timestamp ?? 0,
  isExpired: () => {
    const now = Date.now();
    const bucket = predictionCacheByLanguage[lang];
    return !bucket || (now - bucket.timestamp) >= CACHE_DURATION;
  }
});

export const setCache = (data: any, lang: string = 'vi') => {
  predictionCacheByLanguage[lang] = {
    data,
    timestamp: Date.now()
  };
};

export const clearCache = () => {
  Object.keys(predictionCacheByLanguage).forEach((lang) => {
    delete predictionCacheByLanguage[lang];
  });
};

export const isCacheValid = (lang: string = 'vi') => {
  const now = Date.now();
  const bucket = predictionCacheByLanguage[lang];
  return Boolean(bucket?.data) && (now - bucket.timestamp) < CACHE_DURATION;
};
