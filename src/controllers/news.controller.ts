import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import NewsArticle from '../models/NewsArticle';
import { pickLocalizedText, resolveLanguageFromRequest } from '../utils/language';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u00C0-\u024f\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const generateUniqueSlug = async (title: string, excludeId?: string) => {
  const base = slugify(title) || `news-${Date.now()}`;
  let slug = base;
  let count = 1;
  while (true) {
    const existing = await NewsArticle.findOne({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
    if (!existing) return slug;
    slug = `${base}-${count++}`;
  }
};

export const getNewsList = async (req: AuthRequest, res: Response) => {
  try {
    const lang = resolveLanguageFromRequest(req as any);
    const articles = await NewsArticle.find({ status: 'published' })
      .populate('author', 'name')
      .sort({ publishedAt: -1, createdAt: -1 });
    const localized = articles
      .map((article: any) => {
        const articleObj = article.toObject();
        return {
          ...articleObj,
          title: pickLocalizedText(lang, articleObj.titleTranslations, ''),
          summary: pickLocalizedText(lang, articleObj.summaryTranslations, ''),
          content: pickLocalizedText(lang, articleObj.contentTranslations, '')
        };
      })
      .filter((article) => Boolean(article.title && article.content));
    res.json({ success: true, data: localized });
  } catch (error) {
    console.error('Error getting news list:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getNewsBySlug = async (req: AuthRequest, res: Response) => {
  try {
    const lang = resolveLanguageFromRequest(req as any);
    const article = await NewsArticle.findOne({ slug: req.params.slug, status: 'published' }).populate('author', 'name');
    if (!article) return res.status(404).json({ success: false, message: 'News article not found' });
    const articleObj = article.toObject();
    const localized = {
      ...articleObj,
      title: pickLocalizedText(lang, articleObj.titleTranslations, ''),
      summary: pickLocalizedText(lang, articleObj.summaryTranslations, ''),
      content: pickLocalizedText(lang, articleObj.contentTranslations, '')
    };
    if (!localized.title || !localized.content) {
      return res.status(404).json({ success: false, message: 'News article not found' });
    }
    res.json({ success: true, data: localized });
  } catch (error) {
    console.error('Error getting news:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getManageNewsList = async (_req: AuthRequest, res: Response) => {
  try {
    const articles = await NewsArticle.find().populate('author', 'name role').sort({ createdAt: -1 });
    res.json({ success: true, data: articles });
  } catch (error) {
    console.error('Error getting manage news list:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getManageNewsById = async (req: AuthRequest, res: Response) => {
  try {
    const article = await NewsArticle.findById(req.params.id).populate('author', 'name role');
    if (!article) return res.status(404).json({ success: false, message: 'News article not found' });
    res.json({ success: true, data: article });
  } catch (error) {
    console.error('Error getting manage news by id:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createNews = async (req: AuthRequest, res: Response) => {
  try {
    const { title, summary = '', content, titleTranslations, summaryTranslations, contentTranslations, coverImage = '', status = 'draft' } = req.body;
    const viTitle = titleTranslations?.vi || title;
    const viContent = contentTranslations?.vi || content;
    if (!viTitle || !viContent) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }
    const slug = await generateUniqueSlug(String(viTitle));
    const article = new NewsArticle({
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
  } catch (error) {
    console.error('Error creating news:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateNews = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await NewsArticle.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'News article not found' });

    const updateData: Record<string, unknown> = {};
    const keys = ['title', 'summary', 'content', 'coverImage', 'status'];
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updateData[key] = (req.body as Record<string, unknown>)[key];
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'titleTranslations') || Object.prototype.hasOwnProperty.call(req.body, 'contentTranslations') || Object.prototype.hasOwnProperty.call(req.body, 'summaryTranslations')) {
      const incoming = req.body as Record<string, any>;
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
    const article = await NewsArticle.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.json({ success: true, data: article });
  } catch (error) {
    console.error('Error updating news:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteNews = async (req: AuthRequest, res: Response) => {
  try {
    const article = await NewsArticle.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'News article not found' });
    res.json({ success: true, message: 'News article deleted successfully' });
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
