"use strict";
// Cache utility for managing prediction cache across different routes
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCacheValid = exports.clearCache = exports.setCache = exports.getCache = exports.CACHE_DURATION = void 0;
// Simple in-memory cache for active predictions (5 minutes)
let activePredictionsCache = null;
let cacheTimestamp = 0;
exports.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const getCache = () => ({
    cache: activePredictionsCache,
    timestamp: cacheTimestamp,
    isExpired: () => {
        const now = Date.now();
        return !activePredictionsCache || (now - cacheTimestamp) >= exports.CACHE_DURATION;
    }
});
exports.getCache = getCache;
const setCache = (data) => {
    activePredictionsCache = data;
    cacheTimestamp = Date.now();
};
exports.setCache = setCache;
const clearCache = () => {
    activePredictionsCache = null;
    cacheTimestamp = 0;
};
exports.clearCache = clearCache;
const isCacheValid = () => {
    const now = Date.now();
    return activePredictionsCache && (now - cacheTimestamp) < exports.CACHE_DURATION;
};
exports.isCacheValid = isCacheValid;
//# sourceMappingURL=cache.js.map