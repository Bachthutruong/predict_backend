"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuggestionPackageStatistics = exports.updateSortOrder = exports.toggleSuggestionPackageStatus = exports.deleteSuggestionPackage = exports.updateSuggestionPackage = exports.createSuggestionPackage = exports.getSuggestionPackageById = exports.getAllSuggestionPackages = void 0;
const SuggestionPackage_1 = __importDefault(require("../models/SuggestionPackage"));
// Get all suggestion packages with pagination and filters
const getAllSuggestionPackages = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', isActive = '', sortBy = 'sortOrder', sortOrder = 'asc' } = req.query;
        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (isActive !== '') {
            query.isActive = isActive === 'true';
        }
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const packages = await SuggestionPackage_1.default.find(query)
            .populate('createdBy', 'name email')
            .sort(sortOptions)
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));
        const total = await SuggestionPackage_1.default.countDocuments(query);
        res.json({
            success: true,
            data: packages,
            pagination: {
                current: Number(page),
                pages: Math.ceil(total / Number(limit)),
                total
            }
        });
    }
    catch (error) {
        console.error('Error getting suggestion packages:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getAllSuggestionPackages = getAllSuggestionPackages;
// Get single suggestion package
const getSuggestionPackageById = async (req, res) => {
    try {
        const { id } = req.params;
        const pkg = await SuggestionPackage_1.default.findById(id).populate('createdBy', 'name email');
        if (!pkg) {
            return res.status(404).json({ success: false, message: 'Suggestion package not found' });
        }
        res.json({ success: true, data: pkg });
    }
    catch (error) {
        console.error('Error getting suggestion package:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getSuggestionPackageById = getSuggestionPackageById;
// Create new suggestion package
const createSuggestionPackage = async (req, res) => {
    try {
        const { name, description, price, suggestionCount, isActive = true, isFeatured = false, sortOrder = 0, validityDays = 365 } = req.body;
        const pkg = new SuggestionPackage_1.default({
            name,
            description,
            price,
            suggestionCount,
            isActive,
            isFeatured,
            sortOrder,
            validityDays,
            createdBy: req.user?.id
        });
        await pkg.save();
        res.status(201).json({ success: true, data: pkg });
    }
    catch (error) {
        console.error('Error creating suggestion package:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.createSuggestionPackage = createSuggestionPackage;
// Update suggestion package
const updateSuggestionPackage = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const pkg = await SuggestionPackage_1.default.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('createdBy', 'name email');
        if (!pkg) {
            return res.status(404).json({ success: false, message: 'Suggestion package not found' });
        }
        res.json({ success: true, data: pkg });
    }
    catch (error) {
        console.error('Error updating suggestion package:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateSuggestionPackage = updateSuggestionPackage;
// Delete suggestion package
const deleteSuggestionPackage = async (req, res) => {
    try {
        const { id } = req.params;
        const pkg = await SuggestionPackage_1.default.findByIdAndDelete(id);
        if (!pkg) {
            return res.status(404).json({ success: false, message: 'Suggestion package not found' });
        }
        res.json({ success: true, message: 'Suggestion package deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting suggestion package:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.deleteSuggestionPackage = deleteSuggestionPackage;
// Toggle suggestion package status
const toggleSuggestionPackageStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const pkg = await SuggestionPackage_1.default.findById(id);
        if (!pkg) {
            return res.status(404).json({ success: false, message: 'Suggestion package not found' });
        }
        pkg.isActive = !pkg.isActive;
        await pkg.save();
        res.json({
            success: true,
            data: pkg,
            message: `Suggestion package ${pkg.isActive ? 'activated' : 'deactivated'} successfully`
        });
    }
    catch (error) {
        console.error('Error toggling suggestion package status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.toggleSuggestionPackageStatus = toggleSuggestionPackageStatus;
// Update sort order
const updateSortOrder = async (req, res) => {
    try {
        const { packages } = req.body; // Array of { id, sortOrder }
        const updatePromises = packages.map((pkg) => SuggestionPackage_1.default.findByIdAndUpdate(pkg.id, { sortOrder: pkg.sortOrder }));
        await Promise.all(updatePromises);
        res.json({
            success: true,
            message: 'Sort order updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating sort order:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateSortOrder = updateSortOrder;
// Get suggestion package statistics
const getSuggestionPackageStatistics = async (req, res) => {
    try {
        const { period = '30' } = req.query; // days
        const days = Number(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const stats = await SuggestionPackage_1.default.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalPackages: { $sum: 1 },
                    activePackages: {
                        $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                    },
                    totalPurchases: { $sum: '$purchaseCount' },
                    totalRevenue: { $sum: '$totalRevenue' }
                }
            }
        ]);
        const popularPackages = await SuggestionPackage_1.default.find({ isActive: true })
            .sort({ purchaseCount: -1 })
            .limit(5)
            .select('name purchaseCount totalRevenue');
        res.json({
            success: true,
            data: {
                overview: stats[0] || {
                    totalPackages: 0,
                    activePackages: 0,
                    totalPurchases: 0,
                    totalRevenue: 0
                },
                popularPackages
            }
        });
    }
    catch (error) {
        console.error('Error getting suggestion package statistics:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getSuggestionPackageStatistics = getSuggestionPackageStatistics;
//# sourceMappingURL=adminSuggestionPackage.controller.js.map