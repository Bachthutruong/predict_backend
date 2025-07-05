"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const user_1 = __importDefault(require("../models/user"));
const question_1 = __importDefault(require("../models/question"));
const check_in_1 = __importDefault(require("../models/check-in"));
const router = express_1.default.Router();
// Check today's check-in status
router.get('/status', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        // Check if already checked in today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingCheckIn = await check_in_1.default.findOne({
            userId,
            checkInDate: { $gte: today }
        });
        if (existingCheckIn) {
            return res.json({
                success: true,
                data: {
                    hasCheckedIn: true,
                    isCorrect: existingCheckIn.isCorrect,
                    pointsEarned: existingCheckIn.pointsEarned
                }
            });
        }
        res.json({
            success: true,
            data: {
                hasCheckedIn: false
            }
        });
    }
    catch (error) {
        console.error('Check status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get today's question
router.get('/question', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        // Check if already checked in today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingCheckIn = await check_in_1.default.findOne({
            userId,
            checkInDate: { $gte: today }
        });
        if (existingCheckIn) {
            return res.status(400).json({
                success: false,
                message: 'Already checked in today'
            });
        }
        const question = await question_1.default.findOne({ status: 'active' })
            .sort({ isPriority: -1, displayCount: 1 });
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'No question available'
            });
        }
        res.json({
            success: true,
            data: question
        });
    }
    catch (error) {
        console.error('Get question error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Submit check-in
router.post('/submit', auth_1.authMiddleware, async (req, res) => {
    try {
        const { questionId, answer } = req.body;
        const userId = req.user.id;
        // Check if already checked in today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingCheckIn = await check_in_1.default.findOne({
            userId,
            checkInDate: { $gte: today }
        });
        if (existingCheckIn) {
            return res.status(400).json({
                success: false,
                message: 'Already checked in today'
            });
        }
        const question = await question_1.default.findById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }
        const isCorrect = answer.toLowerCase().trim() === question.answer.toLowerCase().trim();
        // Only allow check-in if answer is correct
        if (!isCorrect) {
            return res.status(400).json({
                success: false,
                message: 'Incorrect answer. Please try again!',
                data: {
                    isCorrect: false
                }
            });
        }
        const pointsEarned = question.points;
        // Create check-in record (only for correct answers)
        const checkIn = new check_in_1.default({
            userId,
            questionId,
            answer,
            isCorrect: true,
            pointsEarned
        });
        await checkIn.save();
        // Update user points and streak
        const user = await user_1.default.findById(userId);
        if (user) {
            user.points += pointsEarned;
            user.consecutiveCheckIns = user.consecutiveCheckIns + 1;
            user.lastCheckInDate = new Date();
            await user.save();
        }
        res.json({
            success: true,
            data: {
                isCorrect: true,
                pointsEarned,
                correctAnswer: question.answer
            },
            message: 'Correct! Points earned and check-in completed!'
        });
    }
    catch (error) {
        console.error('Submit check-in error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=check-in.js.map