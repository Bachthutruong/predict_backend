"use strict";
// Cache utility for managing prediction cache across different routes
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCacheValid = exports.clearCache = exports.setCache = exports.getCache = exports.CACHE_DURATION = void 0;
const predictionCacheByLanguage = {};
exports.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const getCache = (lang = 'vi') => ({
    cache: predictionCacheByLanguage[lang]?.data ?? null,
    timestamp: predictionCacheByLanguage[lang]?.timestamp ?? 0,
    isExpired: () => {
        const now = Date.now();
        const bucket = predictionCacheByLanguage[lang];
        return !bucket || (now - bucket.timestamp) >= exports.CACHE_DURATION;
    }
});
exports.getCache = getCache;
const setCache = (data, lang = 'vi') => {
    predictionCacheByLanguage[lang] = {
        data,
        timestamp: Date.now()
    };
};
exports.setCache = setCache;
const clearCache = () => {
    Object.keys(predictionCacheByLanguage).forEach((lang) => {
        delete predictionCacheByLanguage[lang];
    });
};
exports.clearCache = clearCache;
const isCacheValid = (lang = 'vi') => {
    const now = Date.now();
    const bucket = predictionCacheByLanguage[lang];
    return Boolean(bucket?.data) && (now - bucket.timestamp) < exports.CACHE_DURATION;
};
exports.isCacheValid = isCacheValid;
//# sourceMappingURL=cache.js.map