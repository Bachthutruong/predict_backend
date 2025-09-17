"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCouponStatistics = exports.validateCoupon = exports.toggleCouponStatus = exports.deleteCoupon = exports.updateCoupon = exports.createCoupon = exports.getCouponById = exports.getAllCoupons = void 0;
const Coupon_1 = __importDefault(require("../models/Coupon"));
// Get all coupons with pagination and filters
const getAllCoupons = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', discountType = '', isActive = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const query = {};
        if (search) {
            query.$or = [
                { code: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (discountType) {
            query.discountType = discountType;
        }
        if (isActive !== '') {
            query.isActive = isActive === 'true';
        }
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const coupons = await Coupon_1.default.find(query)
            .populate('createdBy', 'name email')
            .populate('applicableProducts', 'name')
            .populate('excludedProducts', 'name')
            .populate('applicableUsers', 'name email')
            .sort(sortOptions)
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));
        const total = await Coupon_1.default.countDocuments(query);
        res.json({
            success: true,
            data: coupons,
            pagination: {
                current: Number(page),
                pages: Math.ceil(total / Number(limit)),
                total
            }
        });
    }
    catch (error) {
        console.error('Error getting coupons:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getAllCoupons = getAllCoupons;
// Get single coupon
const getCouponById = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon_1.default.findById(id)
            .populate('createdBy', 'name email')
            .populate('applicableProducts', 'name images price')
            .populate('excludedProducts', 'name images price')
            .populate('applicableUsers', 'name email');
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
        res.json({ success: true, data: coupon });
    }
    catch (error) {
        console.error('Error getting coupon:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getCouponById = getCouponById;
// Create new coupon
const createCoupon = async (req, res) => {
    try {
        const { code, name, description, discountType, discountValue, usageLimit, usageLimitPerUser = 1, minimumOrderAmount = 0, minimumQuantity = 0, applicableProducts = [], applicableCategories = [], excludedProducts = [], applicableUsers = [], newUserOnly = false, validFrom, validUntil } = req.body;
        // Check if code already exists
        const existingCoupon = await Coupon_1.default.findOne({ code });
        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code already exists'
            });
        }
        const coupon = new Coupon_1.default({
            code,
            name,
            description,
            discountType,
            discountValue,
            usageLimit,
            usageLimitPerUser,
            minimumOrderAmount,
            minimumQuantity,
            applicableProducts,
            applicableCategories,
            excludedProducts,
            applicableUsers,
            newUserOnly,
            ...(validFrom ? { validFrom: new Date(validFrom) } : {}),
            ...(validUntil ? { validUntil: new Date(validUntil) } : {}),
            createdBy: req.user?.id
        });
        await coupon.save();
        res.status(201).json({ success: true, data: coupon });
    }
    catch (error) {
        console.error('Error creating coupon:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.createCoupon = createCoupon;
// Update coupon
const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        // Handle date fields
        if (updateData.validFrom) {
            updateData.validFrom = new Date(updateData.validFrom);
        }
        if (updateData.validUntil) {
            updateData.validUntil = new Date(updateData.validUntil);
        }
        const coupon = await Coupon_1.default.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('createdBy', 'name email');
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
        res.json({ success: true, data: coupon });
    }
    catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateCoupon = updateCoupon;
// Delete coupon
const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon_1.default.findByIdAndDelete(id);
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
        res.json({ success: true, message: 'Coupon deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.deleteCoupon = deleteCoupon;
// Toggle coupon status
const toggleCouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon_1.default.findById(id);
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
        coupon.isActive = !coupon.isActive;
        await coupon.save();
        res.json({
            success: true,
            data: coupon,
            message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`
        });
    }
    catch (error) {
        console.error('Error toggling coupon status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.toggleCouponStatus = toggleCouponStatus;
// Validate coupon
const validateCoupon = async (req, res) => {
    try {
        const { code, userId, orderAmount, orderItems } = req.body;
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
        const canBeUsed = coupon.canBeUsedBy(userId, orderAmount, orderItems);
        if (!canBeUsed) {
            return res.status(400).json({
                success: false,
                message: 'Coupon cannot be used for this order'
            });
        }
        // Calculate discount amount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (orderAmount * coupon.discountValue) / 100;
        }
        else if (coupon.discountType === 'fixed_amount') {
            discountAmount = Math.min(coupon.discountValue, orderAmount);
        }
        res.json({
            success: true,
            data: {
                coupon,
                discountAmount,
                pointsBonus: coupon.pointsBonus
            }
        });
    }
    catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.validateCoupon = validateCoupon;
// Get coupon statistics
const getCouponStatistics = async (req, res) => {
    try {
        const { period = '30' } = req.query; // days
        const days = Number(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const stats = await Coupon_1.default.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalCoupons: { $sum: 1 },
                    activeCoupons: {
                        $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                    },
                    totalUsage: { $sum: '$usedCount' },
                    totalDiscountGiven: { $sum: '$totalDiscountGiven' }
                }
            }
        ]);
        const typeBreakdown = await Coupon_1.default.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$discountType',
                    count: { $sum: 1 },
                    totalUsage: { $sum: '$usedCount' }
                }
            }
        ]);
        res.json({
            success: true,
            data: {
                overview: stats[0] || {
                    totalCoupons: 0,
                    activeCoupons: 0,
                    totalUsage: 0,
                    totalDiscountGiven: 0
                },
                typeBreakdown
            }
        });
    }
    catch (error) {
        console.error('Error getting coupon statistics:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getCouponStatistics = getCouponStatistics;
//# sourceMappingURL=adminCoupon.controller.js.map