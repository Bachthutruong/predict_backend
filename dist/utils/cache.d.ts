export declare const CACHE_DURATION: number;
export declare const getCache: (lang?: string) => {
    cache: any;
    timestamp: number;
    isExpired: () => boolean;
};
export declare const setCache: (data: any, lang?: string) => void;
export declare const clearCache: () => void;
export declare const isCacheValid: (lang?: string) => boolean;
//# sourceMappingURL=cache.d.ts.map