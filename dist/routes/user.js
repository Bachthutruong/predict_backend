"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const user_1 = __importDefault(require("../models/user"));
const point_transaction_1 = __importDefault(require("../models/point-transaction"));
const referral_1 = __importDefault(require("../models/referral"));
const router = express_1.default.Router();
// Get current user profile
router.get('/profile', auth_1.authMiddleware, async (req, res) => {
    try {
        const user = await user_1.default.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        // Transform the data to match frontend expectations
        const transformedUser = {
            ...user.toObject(),
            id: user._id.toString() // Ensure ID is properly set
        };
        res.json({
            success: true,
            data: transformedUser
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Update user profile
router.put('/profile', auth_1.authMiddleware, async (req, res) => {
    try {
        const { name, avatarUrl } = req.body;
        const user = await user_1.default.findByIdAndUpdate(req.user.id, { name, avatarUrl }, { new: true });
        // Transform the data to match frontend expectations
        const transformedUser = {
            ...user.toObject(),
            id: user._id.toString() // Ensure ID is properly set
        };
        res.json({
            success: true,
            data: transformedUser,
            message: 'Profile updated successfully'
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get user's point transactions
router.get('/transactions', auth_1.authMiddleware, async (req, res) => {
    try {
        const transactions = await point_transaction_1.default.find({ userId: req.user.id })
            .populate('adminId', 'name')
            .sort({ createdAt: -1 })
            .limit(50);
        // Transform the data to match frontend expectations
        const transformedTransactions = transactions.map(transaction => {
            const obj = transaction.toObject();
            return {
                ...obj,
                id: obj._id.toString() // Ensure ID is properly set
            };
        });
        res.json({
            success: true,
            data: transformedTransactions
        });
    }
    catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get user referrals
router.get('/referrals', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        // Get current user
        const currentUser = await user_1.default.findById(userId).select('name email referralCode points');
        if (!currentUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        // Get all referrals made by this user
        const referrals = await referral_1.default.find({ referringUser: userId })
            .populate('referredUser', 'name email createdAt consecutiveCheckIns')
            .sort({ createdAt: -1 });
        // Transform the data to match frontend expectations
        const transformedReferrals = referrals.map(referral => {
            const obj = referral.toObject();
            return {
                ...obj,
                id: obj._id.toString() // Ensure ID is properly set
            };
        });
        res.json({
            success: true,
            data: {
                currentUser: {
                    ...currentUser.toObject(),
                    id: currentUser._id.toString() // Ensure ID is properly set
                },
                referrals: transformedReferrals
            }
        });
    }
    catch (error) {
        console.error('Get referrals error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=user.js.map