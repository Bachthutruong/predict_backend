import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import NewsArticle from '../models/NewsArticle';

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

export const getNewsList = async (_req: AuthRequest, res: Response) => {
  try {
    const articles = await NewsArticle.find({ status: 'published' })
      .populate('author', 'name')
      .sort({ publishedAt: -1, createdAt: -1 });
    res.json({ success: true, data: articles });
  } catch (error) {
    console.error('Error getting news list:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getNewsBySlug = async (req: AuthRequest, res: Response) => {
  try {
    const article = await NewsArticle.findOne({ slug: req.params.slug, status: 'published' }).populate('author', 'name');
    if (!article) return res.status(404).json({ success: false, message: 'News article not found' });
    res.json({ success: true, data: article });
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
    const { title, summary = '', content, coverImage = '', status = 'draft' } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }
    const slug = await generateUniqueSlug(String(title));
    const article = new NewsArticle({
      title,
      slug,
      summary,
      content,
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
