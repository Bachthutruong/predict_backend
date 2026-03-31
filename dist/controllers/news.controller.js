"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNews = exports.updateNews = exports.createNews = exports.getManageNewsById = exports.getManageNewsList = exports.getNewsBySlug = exports.getNewsList = void 0;
const NewsArticle_1 = __importDefault(require("../models/NewsArticle"));
const language_1 = require("../utils/language");
const slugify = (value) => value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u00C0-\u024f\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
const generateUniqueSlug = async (title, excludeId) => {
    const base = slugify(title) || `news-${Date.now()}`;
    let slug = base;
    let count = 1;
    while (true) {
        const existing = await NewsArticle_1.default.findOne({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
        if (!existing)
            return slug;
        slug = `${base}-${count++}`;
    }
};
const getNewsList = async (req, res) => {
    try {
        const lang = (0, language_1.resolveLanguageFromRequest)(req);
        const articles = await NewsArticle_1.default.find({ status: 'published' })
            .populate('author', 'name')
            .sort({ publishedAt: -1, createdAt: -1 });
        const localized = articles
            .map((article) => {
            const articleObj = article.toObject();
            return {
                ...articleObj,
                title: (0, language_1.pickLocalizedText)(lang, articleObj.titleTranslations, ''),
                summary: (0, language_1.pickLocalizedText)(lang, articleObj.summaryTranslations, ''),
                content: (0, language_1.pickLocalizedText)(lang, articleObj.contentTranslations, '')
            };
        })
            .filter((article) => Boolean(article.title && article.content));
        res.json({ success: true, data: localized });
    }
    catch (error) {
        console.error('Error getting news list:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getNewsList = getNewsList;
const getNewsBySlug = async (req, res) => {
    try {
        const lang = (0, language_1.resolveLanguageFromRequest)(req);
        const article = await NewsArticle_1.default.findOne({ slug: req.params.slug, status: 'published' }).populate('author', 'name');
        if (!article)
            return res.status(404).json({ success: false, message: 'News article not found' });
        const articleObj = article.toObject();
        const localized = {
            ...articleObj,
            title: (0, language_1.pickLocalizedText)(lang, articleObj.titleTranslations, ''),
            summary: (0, language_1.pickLocalizedText)(lang, articleObj.summaryTranslations, ''),
            content: (0, language_1.pickLocalizedText)(lang, articleObj.contentTranslations, '')
        };
        if (!localized.title || !localized.content) {
            return res.status(404).json({ success: false, message: 'News article not found' });
        }
        res.json({ success: true, data: localized });
    }
    catch (error) {
        console.error('Error getting news:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getNewsBySlug = getNewsBySlug;
const getManageNewsList = async (_req, res) => {
    try {
        const articles = await NewsArticle_1.default.find().populate('author', 'name role').sort({ createdAt: -1 });
        res.json({ success: true, data: articles });
    }
    catch (error) {
        console.error('Error getting manage news list:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getManageNewsList = getManageNewsList;
const getManageNewsById = async (req, res) => {
    try {
        const article = await NewsArticle_1.default.findById(req.params.id).populate('author', 'name role');
        if (!article)
            return res.status(404).json({ success: false, message: 'News article not found' });
        res.json({ success: true, data: article });
    }
    catch (error) {
        console.error('Error getting manage news by id:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getManageNewsById = getManageNewsById;
const createNews = async (req, res) => {
    try {
        const { title, summary = '', content, titleTranslations, summaryTranslations, contentTranslations, coverImage = '', status = 'draft' } = req.body;
        const viTitle = titleTranslations?.vi || title;
        const viContent = contentTranslations?.vi || content;
        if (!viTitle || !viContent) {
            return res.status(400).json({ success: false, message: 'Title and content are required' });
        }
        const slug = await generateUniqueSlug(String(viTitle));
        const article = new NewsArticle_1.default({
            title: viTitle,
            titleTranslations: {
                vi: viTitle || '',
                'zh-TW': titleTranslations?.['zh-TW'] || ''
            },
            slug,
            summary: summaryTranslations?.vi || summary,
            summaryTranslations: {
                vi: summaryTranslations?.vi || summary || '',
                'zh-TW': summaryTranslations?.['zh-TW'] || ''
            },
            content: viContent,
            contentTranslations: {
                vi: viContent || '',
                'zh-TW': contentTranslations?.['zh-TW'] || ''
            },
            coverImage,
            status,
            publishedAt: status === 'published' ? new Date() : undefined,
            author: req.user?.id
        });
        await article.save();
        res.status(201).json({ success: true, data: article });
    }
    catch (error) {
        console.error('Error creating news:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.createNews = createNews;
const updateNews = async (req, res) => {
    try {
        const existing = await NewsArticle_1.default.findById(req.params.id);
        if (!existing)
            return res.status(404).json({ success: false, message: 'News article not found' });
        const updateData = {};
        const keys = ['title', 'summary', 'content', 'coverImage', 'status'];
        for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                updateData[key] = req.body[key];
            }
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'titleTranslations') || Object.prototype.hasOwnProperty.call(req.body, 'contentTranslations') || Object.prototype.hasOwnProperty.call(req.body, 'summaryTranslations')) {
            const incoming = req.body;
            const resolvedTitleTranslations = {
                vi: incoming.titleTranslations?.vi || incoming.title || existing.titleTranslations?.vi || existing.title || '',
                'zh-TW': incoming.titleTranslations?.['zh-TW'] || existing.titleTranslations?.['zh-TW'] || ''
            };
            const resolvedSummaryTranslations = {
                vi: incoming.summaryTranslations?.vi || incoming.summary || existing.summaryTranslations?.vi || existing.summary || '',
                'zh-TW': incoming.summaryTranslations?.['zh-TW'] || existing.summaryTranslations?.['zh-TW'] || ''
            };
            const resolvedContentTranslations = {
                vi: incoming.contentTranslations?.vi || incoming.content || existing.contentTranslations?.vi || existing.content || '',
                'zh-TW': incoming.contentTranslations?.['zh-TW'] || existing.contentTranslations?.['zh-TW'] || ''
            };
            updateData.titleTranslations = resolvedTitleTranslations;
            updateData.summaryTranslations = resolvedSummaryTranslations;
            updateData.contentTranslations = resolvedContentTranslations;
            updateData.title = resolvedTitleTranslations.vi;
            updateData.summary = resolvedSummaryTranslations.vi;
            updateData.content = resolvedContentTranslations.vi;
        }
        if (typeof updateData.title === 'string' && updateData.title !== existing.title) {
            updateData.slug = await generateUniqueSlug(updateData.title, existing._id.toString());
        }
        if (updateData.status === 'published' && !existing.publishedAt) {
            updateData.publishedAt = new Date();
        }
        const article = await NewsArticle_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        res.json({ success: true, data: article });
    }
    catch (error) {
        console.error('Error updating news:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateNews = updateNews;
const deleteNews = async (req, res) => {
    try {
        const article = await NewsArticle_1.default.findByIdAndDelete(req.params.id);
        if (!article)
            return res.status(404).json({ success: false, message: 'News article not found' });
        res.json({ success: true, message: 'News article deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting news:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.deleteNews = deleteNews;
//# sourceMappingURL=news.controller.js.map