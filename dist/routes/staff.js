"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const user_1 = __importDefault(require("../models/user"));
const prediction_1 = __importDefault(require("../models/prediction"));
const question_1 = __importDefault(require("../models/question"));
const feedback_1 = __importDefault(require("../models/feedback"));
const router = express_1.default.Router();
// Apply auth and staff middleware to all routes
router.use(auth_1.authMiddleware);
router.use(auth_1.staffMiddleware);
// Get staff dashboard stats
router.get('/dashboard-stats', async (req, res) => {
    try {
        const [totalUsers, verifiedUsers, activePredictions, activeQuestions, pendingFeedback, thisMonthUsers] = await Promise.all([
            user_1.default.countDocuments({ role: 'user' }),
            user_1.default.countDocuments({ role: 'user', isEmailVerified: true }),
            prediction_1.default.countDocuments({ status: 'active' }),
            question_1.default.countDocuments({ status: 'active' }),
            feedback_1.default.countDocuments({ status: 'pending' }),
            user_1.default.countDocuments({
                role: 'user',
                createdAt: {
                    $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            })
        ]);
        const topUsers = await user_1.default.find({ role: 'user', isEmailVerified: true })
            .sort({ points: -1 })
            .limit(10)
            .select('name email points consecutiveCheckIns');
        res.json({
            success: true,
            data: {
                totalUsers,
                verifiedUsers,
                activePredictions,
                activeQuestions,
                pendingFeedback,
                thisMonthUsers,
                topUsers
            }
        });
    }
    catch (error) {
        console.error('Staff dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get users for staff management
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, search, verified } = req.query;
        const query = { role: 'user' };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (verified !== undefined) {
            query.isEmailVerified = verified === 'true';
        }
        const users = await user_1.default.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await user_1.default.countDocuments(query);
        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('Get staff users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Update user status (verify/unverify)
router.patch('/users/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { isEmailVerified } = req.body;
        const user = await user_1.default.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        if (user.role !== 'user') {
            return res.status(400).json({
                success: false,
                message: 'Can only modify regular users'
            });
        }
        user.isEmailVerified = isEmailVerified;
        await user.save();
        res.json({
            success: true,
            data: user,
            message: `User ${isEmailVerified ? 'verified' : 'unverified'} successfully`
        });
    }
    catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get predictions for staff review
router.get('/predictions', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const query = {};
        if (status) {
            query.status = status;
        }
        const predictions = await prediction_1.default.find(query)
            .populate('authorId', 'name email')
            .populate('winnerId', 'name email avatarUrl')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await prediction_1.default.countDocuments(query);
        // Transform the data to match frontend expectations
        const transformedPredictions = predictions.map(prediction => {
            const obj = prediction.toObject();
            return {
                ...obj,
                id: obj._id.toString() // Ensure ID is properly set
            };
        });
        res.json({
            success: true,
            data: {
                predictions: transformedPredictions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('Get staff predictions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Update prediction status
router.patch('/predictions/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['active', 'finished'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }
        const prediction = await prediction_1.default.findByIdAndUpdate(id, { status }, { new: true });
        if (!prediction) {
            return res.status(404).json({
                success: false,
                message: 'Prediction not found'
            });
        }
        res.json({
            success: true,
            data: prediction,
            message: `Prediction ${status} successfully`
        });
    }
    catch (error) {
        console.error('Update prediction status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get questions for staff management
router.get('/questions', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const query = {};
        if (status) {
            query.status = status;
        }
        const questions = await question_1.default.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await question_1.default.countDocuments(query);
        res.json({
            success: true,
            data: {
                questions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('Get staff questions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Update question status
router.patch('/questions/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }
        const question = await question_1.default.findByIdAndUpdate(id, { status }, { new: true });
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        res.json({
            success: true,
            data: question,
            message: `Question ${status} successfully`
        });
    }
    catch (error) {
        console.error('Update question status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Create question (Staff can create but not modify points)
router.post('/questions', async (req, res) => {
    try {
        const { questionText, imageUrl, answer, isPriority } = req.body;
        const question = new question_1.default({
            questionText,
            imageUrl,
            answer,
            isPriority: isPriority || false,
            points: 10 // Staff cannot modify points, default to 10
        });
        await question.save();
        res.status(201).json({
            success: true,
            data: question,
            message: 'Question created successfully'
        });
    }
    catch (error) {
        console.error('Create question error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Update question (Staff cannot modify points)
router.put('/questions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { questionText, imageUrl, answer, isPriority } = req.body;
        const updateData = {
            questionText,
            imageUrl,
            answer,
            isPriority
        };
        const question = await question_1.default.findByIdAndUpdate(id, updateData, { new: true });
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        res.json({
            success: true,
            data: question,
            message: 'Question updated successfully'
        });
    }
    catch (error) {
        console.error('Update question error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Update question priority
router.patch('/questions/:id/priority', async (req, res) => {
    try {
        const { id } = req.params;
        const { isPriority } = req.body;
        const question = await question_1.default.findByIdAndUpdate(id, { isPriority }, { new: true });
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        res.json({
            success: true,
            data: question,
            message: `Question priority ${isPriority ? 'enabled' : 'disabled'} successfully`
        });
    }
    catch (error) {
        console.error('Update question priority error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=staff.js.map