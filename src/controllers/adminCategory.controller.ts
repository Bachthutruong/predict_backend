import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Category from '../models/Category';

export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, search = '', isActive = '' } = req.query;
    const query: any = {};
    if (search) {
      const s = String(search);
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } },
      ];
    }
    if (isActive !== '') query.isActive = isActive === 'true';

    const categories = await Category.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    const total = await Category.countDocuments(query);
    res.json({ success: true, data: categories, pagination: { current: Number(page), pages: Math.ceil(total / Number(limit)), total } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCategoryById = async (req: AuthRequest, res: Response) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: category });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, description = '', isActive = true, sortOrder = 0 } = req.body;
    const exists = await Category.findOne({ slug });
    if (exists) return res.status(400).json({ success: false, message: 'Slug already exists' });
    const category = await Category.create({ name, slug, description, isActive, sortOrder, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: category });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: category });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const toggleCategoryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    category.isActive = !category.isActive;
    await category.save();
    res.json({ success: true, data: category });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


