"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleCategoryStatus = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategoryById = exports.getCategories = void 0;
const Category_1 = __importDefault(require("../models/Category"));
const getCategories = async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '', isActive = '' } = req.query;
        const query = {};
        if (search) {
            const s = String(search);
            query.$or = [
                { name: { $regex: s, $options: 'i' } },
                { description: { $regex: s, $options: 'i' } },
            ];
        }
        if (isActive !== '')
            query.isActive = isActive === 'true';
        const categories = await Category_1.default.find(query)
            .sort({ sortOrder: 1, createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Category_1.default.countDocuments(query);
        res.json({ success: true, data: categories, pagination: { current: Number(page), pages: Math.ceil(total / Number(limit)), total } });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getCategories = getCategories;
const getCategoryById = async (req, res) => {
    try {
        const category = await Category_1.default.findById(req.params.id);
        if (!category)
            return res.status(404).json({ success: false, message: 'Category not found' });
        res.json({ success: true, data: category });
    }
    catch {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getCategoryById = getCategoryById;
const createCategory = async (req, res) => {
    try {
        const { name, slug, description = '', isActive = true, sortOrder = 0 } = req.body;
        const exists = await Category_1.default.findOne({ slug });
        if (exists)
            return res.status(400).json({ success: false, message: 'Slug already exists' });
        const category = await Category_1.default.create({ name, slug, description, isActive, sortOrder, createdBy: req.user?.id });
        res.status(201).json({ success: true, data: category });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.createCategory = createCategory;
const updateCategory = async (req, res) => {
    try {
        const category = await Category_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!category)
            return res.status(404).json({ success: false, message: 'Category not found' });
        res.json({ success: true, data: category });
    }
    catch {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res) => {
    try {
        const category = await Category_1.default.findByIdAndDelete(req.params.id);
        if (!category)
            return res.status(404).json({ success: false, message: 'Category not found' });
        res.json({ success: true, message: 'Category deleted' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.deleteCategory = deleteCategory;
const toggleCategoryStatus = async (req, res) => {
    try {
        const category = await Category_1.default.findById(req.params.id);
        if (!category)
            return res.status(404).json({ success: false, message: 'Category not found' });
        category.isActive = !category.isActive;
        await category.save();
        res.json({ success: true, data: category });
    }
    catch {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.toggleCategoryStatus = toggleCategoryStatus;
//# sourceMappingURL=adminCategory.controller.js.map