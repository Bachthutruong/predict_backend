"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prediction_1 = __importDefault(require("../models/prediction"));
const user_1 = __importDefault(require("../models/user"));
const feedback_1 = __importDefault(require("../models/feedback"));
const question_1 = __importDefault(require("../models/question"));
const point_transaction_1 = __importDefault(require("../models/point-transaction"));
const user_prediction_1 = __importDefault(require("../models/user-prediction"));
const router = express_1.default.Router();
// Apply auth middleware to all routes
router.use(auth_1.authMiddleware);
router.use(auth_1.adminMiddleware);
// Admin Dashboard Stats
router.get('/dashboard-stats', async (req, res) => {
    try {
        const [totalUsers, totalPredictions, activePredictions, totalPoints, pendingFeedback, totalStaff, thisMonthUsers, thisMonthPredictions] = await Promise.all([
            user_1.default.countDocuments({ role: 'user' }),
            prediction_1.default.countDocuments(),
            prediction_1.default.countDocuments({ status: 'active' }),
            user_1.default.aggregate([
                { $match: { role: 'user' } },
                { $group: { _id: null, total: { $sum: '$points' } } }
            ]).then(result => result[0]?.total || 0),
            feedback_1.default.countDocuments({ status: 'pending' }),
            user_1.default.countDocuments({ role: 'staff' }),
            user_1.default.countDocuments({
                role: 'user',
                createdAt: {
                    $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            }),
            prediction_1.default.countDocuments({
                createdAt: {
                    $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            })
        ]);
        const recentPredictions = await prediction_1.default.find()
            .populate('authorId', 'name')
            .sort({ createdAt: -1 })
            .limit(5);
        res.json({
            success: true,
            data: {
                totalUsers,
                totalPredictions,
                activePredictions,
                totalPoints,
                pendingFeedback,
                totalStaff,
                thisMonthUsers,
                thisMonthPredictions,
                recentPredictions
            }
        });
    }
    catch (error) {
        console.error('Admin dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Create prediction
router.post('/predictions', async (req, res) => {
    try {
        const { title, description, imageUrl, correctAnswer, pointsCost } = req.body;
        const prediction = new prediction_1.default({
            title,
            description,
            imageUrl,
            answer: correctAnswer,
            pointsCost,
            authorId: req.user.id
        });
        await prediction.save();
        // Transform the data to match frontend expectations
        const transformedPrediction = {
            ...prediction.toObject(),
            correctAnswer: prediction.answer
        };
        res.status(201).json({
            success: true,
            data: transformedPrediction,
            message: 'Prediction created successfully'
        });
    }
    catch (error) {
        console.error('Create prediction error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get all predictions
router.get('/predictions', async (req, res) => {
    try {
        const predictions = await prediction_1.default.find()
            .populate('authorId', 'name')
            .populate('winnerId', 'name avatarUrl')
            .sort({ createdAt: -1 });
        // Transform the data to match frontend expectations
        const transformedPredictions = predictions.map(prediction => {
            const obj = prediction.toObject();
            return {
                ...obj,
                correctAnswer: obj.answer
            };
        });
        res.json({
            success: true,
            data: transformedPredictions
        });
    }
    catch (error) {
        console.error('Get all predictions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get prediction details with user predictions
router.get('/predictions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const prediction = await prediction_1.default.findById(id)
            .populate('authorId', 'name')
            .populate('winnerId', 'name avatarUrl');
        if (!prediction) {
            return res.status(404).json({
                success: false,
                message: 'Prediction not found'
            });
        }
        // Get user predictions for this prediction
        const userPredictions = await user_prediction_1.default.find({ predictionId: id })
            .populate('userId', 'name avatarUrl')
            .sort({ createdAt: -1 });
        // Calculate stats
        const totalPredictions = userPredictions.length;
        const correctPredictions = userPredictions.filter(up => up.isCorrect).length;
        const totalPointsAwarded = userPredictions
            .filter(up => up.isCorrect)
            .reduce((sum, up) => sum + up.pointsSpent, 0);
        // Transform user predictions to match frontend expectations
        const transformedUserPredictions = userPredictions.map(up => {
            const obj = up.toObject();
            return {
                ...obj,
                user: obj.userId
            };
        });
        const predictionWithStats = {
            ...prediction.toObject(),
            correctAnswer: prediction.answer,
            totalPredictions,
            correctPredictions,
            totalPointsAwarded,
            userPredictions: transformedUserPredictions
        };
        res.json({
            success: true,
            data: predictionWithStats
        });
    }
    catch (error) {
        console.error('Get prediction details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Update prediction
router.put('/predictions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, imageUrl, correctAnswer, pointsCost, status } = req.body;
        const prediction = await prediction_1.default.findById(id);
        if (!prediction) {
            return res.status(404).json({
                success: false,
                message: 'Prediction not found'
            });
        }
        // Update prediction fields
        prediction.title = title;
        prediction.description = description;
        prediction.imageUrl = imageUrl;
        prediction.answer = correctAnswer;
        prediction.pointsCost = pointsCost;
        prediction.status = status;
        await prediction.save();
        // Transform the data to match frontend expectations
        const transformedPrediction = {
            ...prediction.toObject(),
            correctAnswer: prediction.answer
        };
        res.json({
            success: true,
            data: transformedPrediction,
            message: 'Prediction updated successfully'
        });
    }
    catch (error) {
        console.error('Update prediction error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Delete prediction
router.delete('/predictions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const prediction = await prediction_1.default.findById(id);
        if (!prediction) {
            return res.status(404).json({
                success: false,
                message: 'Prediction not found'
            });
        }
        // Delete associated user predictions
        await user_prediction_1.default.deleteMany({ predictionId: id });
        // Delete the prediction
        await prediction_1.default.findByIdAndDelete(id);
        res.json({
            success: true,
            message: 'Prediction deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete prediction error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Update prediction status
router.put('/predictions/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const prediction = await prediction_1.default.findById(id);
        if (!prediction) {
            return res.status(404).json({
                success: false,
                message: 'Prediction not found'
            });
        }
        prediction.status = status;
        await prediction.save();
        // Transform the data to match frontend expectations
        const transformedPrediction = {
            ...prediction.toObject(),
            correctAnswer: prediction.answer
        };
        res.json({
            success: true,
            data: transformedPrediction,
            message: `Prediction status updated to ${status}`
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
// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await user_1.default.find()
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: users
        });
    }
    catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Grant points to user
router.post('/grant-points', async (req, res) => {
    try {
        const { userId, amount, notes } = req.body;
        const user = await user_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        user.points += amount;
        await user.save();
        // Record the transaction
        await point_transaction_1.default.create({
            userId: userId,
            adminId: req.user.id,
            amount,
            reason: 'admin-grant',
            notes
        });
        res.json({
            success: true,
            message: `${amount} points granted to ${user.name}`
        });
    }
    catch (error) {
        console.error('Grant points error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get all feedback for admin review
router.get('/feedback', async (req, res) => {
    try {
        const feedback = await feedback_1.default.find()
            .populate('userId', 'name email avatarUrl')
            .sort({ createdAt: -1 });
        // Transform the data to match frontend expectations
        const transformedFeedback = feedback.map(item => {
            const obj = item.toObject();
            return {
                ...obj,
                id: obj._id.toString(), // Ensure ID is properly set
                user: obj.userId
            };
        });
        res.json({
            success: true,
            data: transformedFeedback
        });
    }
    catch (error) {
        console.error('Get feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Approve feedback and award points
router.patch('/feedback/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { points } = req.body;
        const feedback = await feedback_1.default.findById(id).populate('userId');
        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: 'Feedback not found'
            });
        }
        if (feedback.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Feedback has already been processed'
            });
        }
        // Update feedback status
        feedback.status = 'approved';
        feedback.awardedPoints = points;
        await feedback.save();
        // Award points to user
        await user_1.default.findByIdAndUpdate(feedback.userId, {
            $inc: { points: points }
        });
        // Record transaction
        await point_transaction_1.default.create({
            userId: feedback.userId,
            adminId: req.user.id,
            amount: points,
            reason: 'feedback',
            notes: `Feedback approved: ${feedback.feedbackText.substring(0, 50)}...`
        });
        res.json({
            success: true,
            message: 'Feedback approved and points awarded'
        });
    }
    catch (error) {
        console.error('Approve feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Reject feedback
router.patch('/feedback/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const feedback = await feedback_1.default.findById(id);
        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: 'Feedback not found'
            });
        }
        if (feedback.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Feedback has already been processed'
            });
        }
        feedback.status = 'rejected';
        await feedback.save();
        res.json({
            success: true,
            message: 'Feedback rejected'
        });
    }
    catch (error) {
        console.error('Reject feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get all questions
router.get('/questions', async (req, res) => {
    try {
        const questions = await question_1.default.find()
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: questions
        });
    }
    catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Create question
router.post('/questions', async (req, res) => {
    try {
        const { questionText, imageUrl, answer, isPriority, points } = req.body;
        const question = new question_1.default({
            questionText,
            imageUrl,
            answer,
            isPriority: isPriority || false,
            points: points || 10
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
// Update question
router.put('/questions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
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
// Get point transactions
router.get('/transactions', async (req, res) => {
    try {
        const transactions = await point_transaction_1.default.find()
            .populate('userId', 'name email')
            .populate('adminId', 'name')
            .sort({ createdAt: -1 })
            .limit(100);
        // Transform the data to match frontend expectations
        const transformedTransactions = transactions.map(transaction => {
            const obj = transaction.toObject();
            return {
                ...obj,
                user: obj.userId,
                admin: obj.adminId
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
// Staff Management
// Get all staff users
router.get('/staff', async (req, res) => {
    try {
        const staff = await user_1.default.find({ role: 'staff' })
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: staff
        });
    }
    catch (error) {
        console.error('Get staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Create staff account
router.post('/staff', async (req, res) => {
    try {
        const { name, email, password, avatarUrl } = req.body;
        // Check if email already exists
        const existingUser = await user_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }
        const staff = new user_1.default({
            name,
            email,
            password,
            avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
            role: 'staff',
            isEmailVerified: true // Staff accounts are pre-verified
        });
        await staff.save();
        res.status(201).json({
            success: true,
            data: staff,
            message: 'Staff account created successfully'
        });
    }
    catch (error) {
        console.error('Create staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Update staff account
router.put('/staff/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, avatarUrl } = req.body;
        const staff = await user_1.default.findById(id);
        if (!staff || staff.role !== 'staff') {
            return res.status(404).json({
                success: false,
                message: 'Staff account not found'
            });
        }
        // Check if email is being changed and already exists
        if (email !== staff.email) {
            const existingUser = await user_1.default.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
        }
        const updateData = {
            name,
            email,
            avatarUrl
        };
        if (password) {
            updateData.password = password;
        }
        const updatedStaff = await user_1.default.findByIdAndUpdate(id, updateData, { new: true });
        res.json({
            success: true,
            data: updatedStaff,
            message: 'Staff account updated successfully'
        });
    }
    catch (error) {
        console.error('Update staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Delete staff account
router.delete('/staff/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const staff = await user_1.default.findById(id);
        if (!staff || staff.role !== 'staff') {
            return res.status(404).json({
                success: false,
                message: 'Staff account not found'
            });
        }
        await user_1.default.findByIdAndDelete(id);
        res.json({
            success: true,
            message: 'Staff account deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map