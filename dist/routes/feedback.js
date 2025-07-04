"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("@/middleware/auth");
const feedback_1 = __importDefault(require("@/models/feedback"));
const router = express_1.default.Router();
// Submit feedback
router.post('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { feedbackText } = req.body;
        const feedback = new feedback_1.default({
            userId: req.user.id,
            feedbackText
        });
        await feedback.save();
        res.status(201).json({
            success: true,
            data: feedback,
            message: 'Feedback submitted successfully'
        });
    }
    catch (error) {
        console.error('Submit feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get user's feedback
router.get('/my', auth_1.authMiddleware, async (req, res) => {
    try {
        const feedback = await feedback_1.default.find({ userId: req.user.id })
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: feedback
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
exports.default = router;
//# sourceMappingURL=feedback.js.map