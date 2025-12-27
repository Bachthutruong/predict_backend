"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentConfig = exports.getBranches = exports.searchProducts = exports.validateCoupon = exports.getSuggestionPackages = exports.getFeaturedProducts = exports.getProductCategories = exports.getShopProductById = exports.getShopProducts = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Category_1 = __importDefault(require("../models/Category"));
const Coupon_1 = __importDefault(require("../models/Coupon"));
const SuggestionPackage_1 = __importDefault(require("../models/SuggestionPackage"));
const Branch_1 = __importDefault(require("../models/Branch"));
const PaymentConfig_1 = __importDefault(require("../models/PaymentConfig"));
// Get all products for shop (public)
const getShopProducts = async (req, res) => {
    try {
        const { page = 1, limit = 12, search = '', category = '', minPrice = '', maxPrice = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const query = { isActive: true };
        if (search) {
            const searchStr = String(search);
            query.$or = [
                { name: { $regex: searchStr, $options: 'i' } },
                { description: { $regex: searchStr, $options: 'i' } },
                { tags: { $in: [new RegExp(searchStr, 'i')] } }
            ];
        }
        if (category) {
            query.category = category;
        }
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice)
                query.price.$gte = Number(minPrice);
            if (maxPrice)
                query.price.$lte = Number(maxPrice);
        }
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const products = await Product_1.default.find(query)
            .select('-createdBy -metaTitle -metaDescription')
            .sort(sortOptions)
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));
        const total = await Product_1.default.countDocuments(query);
        res.json({
            success: true,
            data: products,
            pagination: {
                current: Number(page),
                pages: Math.ceil(total / Number(limit)),
                total
            }
        });
    }
    catch (error) {
        console.error('Error getting shop products:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getShopProducts = getShopProducts;
// Get single product for shop
const getShopProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product_1.default.findOne({ _id: id, isActive: true })
            .select('-createdBy -metaTitle -metaDescription');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        // Increment view count
        await Product_1.default.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
        res.json({ success: true, data: product });
    }
    catch (error) {
        console.error('Error getting shop product:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getShopProductById = getShopProductById;
// Get product categories
const getProductCategories = async (req, res) => {
    try {
        // Prefer Category collection if exists
        const categoriesDocs = await Category_1.default.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).select('name');
        if (categoriesDocs.length > 0) {
            return res.json({ success: true, data: categoriesDocs.map(c => c.name) });
        }
        // Fallback to distinct from products
        const categories = await Product_1.default.distinct('category', { isActive: true });
        res.json({ success: true, data: categories });
    }
    catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getProductCategories = getProductCategories;
// Get featured products
const getFeaturedProducts = async (req, res) => {
    try {
        const { limit = 8 } = req.query;
        const products = await Product_1.default.find({
            isActive: true,
            isFeatured: true
        })
            .select('-createdBy -metaTitle -metaDescription')
            .sort({ createdAt: -1 })
            .limit(Number(limit));
        res.json({ success: true, data: products });
    }
    catch (error) {
        console.error('Error getting featured products:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getFeaturedProducts = getFeaturedProducts;
// Get suggestion packages for shop
const getSuggestionPackages = async (req, res) => {
    try {
        const packages = await SuggestionPackage_1.default.find({ isActive: true })
            .sort({ sortOrder: 1, createdAt: -1 })
            .select('-createdBy');
        res.json({ success: true, data: packages });
    }
    catch (error) {
        console.error('Error getting suggestion packages:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getSuggestionPackages = getSuggestionPackages;
// Validate coupon for shop
const validateCoupon = async (req, res) => {
    try {
        const { code, orderAmount, orderItems } = req.body;
        const coupon = await Coupon_1.default.findOne({ code });
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }
        const isValid = coupon.isValid();
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Coupon is not valid or has expired'
            });
        }
        // For public validation, we don't check user-specific restrictions
        // This will be done again during checkout with user context
        // Calculate discount amount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (orderAmount * coupon.discountValue) / 100;
        }
        else if (coupon.discountType === 'fixed_amount') {
            discountAmount = Math.min(coupon.discountValue, orderAmount);
        }
        else if (coupon.discountType === 'free_shipping') {
            discountAmount = 0; // Will be handled separately
        }
        res.json({
            success: true,
            data: {
                coupon: {
                    id: coupon._id,
                    code: coupon.code,
                    name: coupon.name,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue
                },
                discountAmount,
                isFreeShipping: coupon.discountType === 'free_shipping'
            }
        });
    }
    catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.validateCoupon = validateCoupon;
// Search products
const searchProducts = async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        const products = await Product_1.default.find({
            isActive: true,
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { tags: { $in: [new RegExp(q, 'i')] } }
            ]
        })
            .select('name images price originalPrice category')
            .limit(Number(limit));
        res.json({ success: true, data: products });
    }
    catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.searchProducts = searchProducts;
// Get branches
const getBranches = async (req, res) => {
    try {
        const branches = await Branch_1.default.find({ isActive: true });
        res.json({ success: true, data: branches });
    }
    catch (error) {
        console.error('Error getting branches:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getBranches = getBranches;
// Get payment config
const getPaymentConfig = async (req, res) => {
    try {
        const config = await PaymentConfig_1.default.findOne({ isActive: true });
        res.json({ success: true, data: config });
    }
    catch (error) {
        console.error('Error getting payment config:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getPaymentConfig = getPaymentConfig;
//# sourceMappingURL=shop.controller.js.map