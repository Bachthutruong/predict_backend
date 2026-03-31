"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickLocalizedText = exports.resolveLanguageFromRequest = void 0;
const isTraditionalChineseHost = (host) => {
    const normalizedHost = host.toLowerCase();
    if (!normalizedHost)
        return false;
    return (normalizedHost.startsWith('tw.') ||
        normalizedHost.includes('.tw.') ||
        normalizedHost.startsWith('tw-') ||
        normalizedHost.includes('-tw.') ||
        normalizedHost.endsWith('.tw'));
};
const resolveLanguageFromRequest = (req) => {
    const langQuery = String(req.query.lang || '').toLowerCase();
    const langHeader = String(req.headers['x-language'] || '').toLowerCase();
    const host = String(req.headers.host || '').toLowerCase();
    const value = langQuery || langHeader;
    if (value === 'zh-tw' || value === 'zh' || value === 'tw')
        return 'zh-TW';
    if (value === 'vi')
        return 'vi';
    if (isTraditionalChineseHost(host))
        return 'zh-TW';
    return 'vi';
};
exports.resolveLanguageFromRequest = resolveLanguageFromRequest;
const pickLocalizedText = (lang, translations, fallback = '') => {
    if (!translations)
        return fallback;
    return translations[lang] || '';
};
exports.pickLocalizedText = pickLocalizedText;
//# sourceMappingURL=language.js.map