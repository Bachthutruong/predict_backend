import { Request } from 'express';
export type AppLanguage = 'vi' | 'zh-TW';
export declare const resolveLanguageFromRequest: (req: Request) => AppLanguage;
export declare const pickLocalizedText: (lang: AppLanguage, translations: Record<string, string> | undefined, fallback?: string) => string;
//# sourceMappingURL=language.d.ts.map