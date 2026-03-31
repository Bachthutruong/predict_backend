import { Request } from 'express';

export type AppLanguage = 'vi' | 'zh-TW';

const isTraditionalChineseHost = (host: string): boolean => {
  const normalizedHost = host.toLowerCase();
  if (!normalizedHost) return false;
  return (
    normalizedHost.startsWith('tw.') ||
    normalizedHost.includes('.tw.') ||
    normalizedHost.startsWith('tw-') ||
    normalizedHost.includes('-tw.') ||
    normalizedHost.endsWith('.tw')
  );
};

export const resolveLanguageFromRequest = (req: Request): AppLanguage => {
  const langQuery = String(req.query.lang || '').toLowerCase();
  const langHeader = String(req.headers['x-language'] || '').toLowerCase();
  const host = String(req.headers.host || '').toLowerCase();

  const value = langQuery || langHeader;
  if (value === 'zh-tw' || value === 'zh' || value === 'tw') return 'zh-TW';
  if (value === 'vi') return 'vi';

  if (isTraditionalChineseHost(host)) return 'zh-TW';
  return 'vi';
};

export const pickLocalizedText = (
  lang: AppLanguage,
  translations: Record<string, string> | undefined,
  fallback = ''
): string => {
  if (!translations) return fallback;
  return translations[lang] || '';
};

