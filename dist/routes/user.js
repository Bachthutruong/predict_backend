"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
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
        const { name, avatarUrl, phone, dateOfBirth, gender, address } = req.body;
        const updateData = {};
        // Only update fields that are provided
        if (name !== undefined)
            updateData.name = name;
        if (avatarUrl !== undefined)
            updateData.avatarUrl = avatarUrl;
        if (phone !== undefined)
            updateData.phone = phone;
        if (dateOfBirth !== undefined)
            updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
        if (gender !== undefined)
            updateData.gender = gender;
        // Handle address object
        if (address && typeof address === 'object') {
            updateData.address = {};
            if (address.street !== undefined)
                updateData.address.street = address.street;
            if (address.city !== undefined)
                updateData.address.city = address.city;
            if (address.state !== undefined)
                updateData.address.state = address.state;
            if (address.postalCode !== undefined)
                updateData.address.postalCode = address.postalCode;
            if (address.country !== undefined)
                updateData.address.country = address.country;
        }
        const user = await user_1.default.findByIdAndUpdate(req.user.id, updateData, { new: true });
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
// Change user password
router.put('/profile/password', auth_1.authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }
        // Get user with password
        const user = await user_1.default.findById(req.user.id).select('+password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        // Check if user was auto-created (might have random password)
        let isCurrentPasswordValid = false;
        if (user.isAutoCreated && currentPassword === 'auto-created') {
            // Allow special bypass for auto-created users
            isCurrentPasswordValid = true;
            console.log(`🔑 Auto-created user ${user.email} changing password for first time`);
        }
        else {
            // Verify current password
            isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password);
        }
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        // Hash new password
        const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, 10);
        // Update password and mark as no longer auto-created
        await user_1.default.findByIdAndUpdate(req.user.id, {
            password: hashedNewPassword,
            isAutoCreated: false // User has now set their own password
        });
        console.log(`✅ User ${user.email} changed password successfully`);
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        console.error('Change password error:', error);
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
            .sort({ createdAt: -1 });
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
// Set referral code (only if not set)
router.post('/set-referral-code', auth_1.authMiddleware, async (req, res) => {
    try {
        const { referralCode } = req.body;
        if (!referralCode || typeof referralCode !== 'string' || referralCode.trim().length < 4) {
            return res.status(400).json({
                success: false,
                message: 'Referral code must be at least 4 characters.'
            });
        }
        const user = await user_1.default.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (user.referralCode) {
            return res.status(400).json({
                success: false,
                message: 'Referral code already set and cannot be changed.'
            });
        }
        // Check uniqueness
        const existing = await user_1.default.findOne({ referralCode: referralCode.trim().toUpperCase() });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Referral code already exists. Please choose another.'
            });
        }
        user.referralCode = referralCode.trim().toUpperCase();
        await user.save();
        res.json({
            success: true,
            data: { referralCode: user.referralCode },
            message: 'Referral code set successfully.'
        });
    }
    catch (error) {
        console.error('Set referral code error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=user.js.map