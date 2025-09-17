export declare const CACHE_DURATION: number;
export declare const getCache: () => {
    cache: any;
    timestamp: number;
    isExpired: () => boolean;
};
export declare const setCache: (data: any) => void;
export declare const clearCache: () => void;
export declare const isCacheValid: () => any;
//# sourceMappingURL=cache.d.ts.map