"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("@/middleware/auth");
const prediction_1 = __importDefault(require("@/models/prediction"));
const user_prediction_1 = __importDefault(require("@/models/user-prediction"));
const user_1 = __importDefault(require("@/models/user"));
const router = express_1.default.Router();
// Get all active predictions
router.get('/', async (req, res) => {
    try {
        const predictions = await prediction_1.default.find({ status: 'active' })
            .populate('authorId', 'name')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: predictions
        });
    }
    catch (error) {
        console.error('Get predictions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get prediction details
router.get('/:id', async (req, res) => {
    try {
        const prediction = await prediction_1.default.findById(req.params.id)
            .populate('authorId', 'name avatarUrl')
            .populate('winnerId', 'name avatarUrl');
        if (!prediction) {
            return res.status(404).json({
                success: false,
                message: 'Prediction not found'
            });
        }
        const userPredictions = await user_prediction_1.default.find({ predictionId: req.params.id })
            .populate('userId', 'name avatarUrl')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: {
                prediction,
                userPredictions
            }
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
// Submit prediction
router.post('/:id/submit', auth_1.authMiddleware, async (req, res) => {
    try {
        const { guess } = req.body;
        const predictionId = req.params.id;
        const userId = req.user.id;
        const prediction = await prediction_1.default.findById(predictionId);
        if (!prediction) {
            return res.status(404).json({
                success: false,
                message: 'Prediction not found'
            });
        }
        if (prediction.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Prediction is not active'
            });
        }
        const user = await user_1.default.findById(userId);
        if (!user || user.points < prediction.pointsCost) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient points'
            });
        }
        // Check if guess is correct
        const isCorrect = guess.toLowerCase().trim() === prediction.answer.toLowerCase().trim();
        // Deduct points
        user.points -= prediction.pointsCost;
        await user.save();
        // Create user prediction
        const userPrediction = new user_prediction_1.default({
            userId,
            predictionId,
            guess,
            isCorrect,
            pointsSpent: prediction.pointsCost
        });
        await userPrediction.save();
        // If correct, award points and mark prediction as finished
        if (isCorrect) {
            const bonusPoints = Math.round(prediction.pointsCost * 1.5);
            user.points += bonusPoints;
            await user.save();
            prediction.status = 'finished';
            prediction.winnerId = user._id;
            await prediction.save();
            return res.json({
                success: true,
                data: { isCorrect: true, bonusPoints },
                message: 'Correct prediction! You won bonus points!'
            });
        }
        res.json({
            success: true,
            data: { isCorrect: false },
            message: 'Prediction submitted successfully'
        });
    }
    catch (error) {
        console.error('Submit prediction error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=prediction.js.map