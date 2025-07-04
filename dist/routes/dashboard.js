"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_1 = __importDefault(require("@/models/user"));
const prediction_1 = __importDefault(require("@/models/prediction"));
const router = express_1.default.Router();
// Get dashboard stats
router.get('/stats', async (req, res) => {
    try {
        // Get platform stats
        const [totalUsers, totalPredictions, activePredictions, totalPointsResult] = await Promise.all([
            user_1.default.countDocuments(),
            prediction_1.default.countDocuments(),
            prediction_1.default.countDocuments({ status: 'active' }),
            user_1.default.aggregate([
                { $group: { _id: null, total: { $sum: '$points' } } }
            ])
        ]);
        const totalPoints = totalPointsResult[0]?.total || 0;
        // Get recent predictions
        const recentPredictions = await prediction_1.default.find({ status: 'active' })
            .sort({ createdAt: -1 })
            .limit(6);
        res.json({
            success: true,
            data: {
                totalUsers,
                totalPredictions,
                activePredictions,
                totalPoints,
                recentPredictions
            }
        });
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get homepage stats (public endpoint for caching)
router.get('/homepage-stats', async (req, res) => {
    try {
        const [totalUsers, totalPredictions, activePredictions, totalPointsInSystem] = await Promise.all([
            user_1.default.countDocuments(),
            prediction_1.default.countDocuments(),
            prediction_1.default.countDocuments({ status: 'active' }),
            user_1.default.aggregate([{ $group: { _id: null, totalPoints: { $sum: '$points' } } }])
        ]);
        const totalPoints = totalPointsInSystem[0]?.totalPoints || 0;
        res.json({
            success: true,
            data: {
                totalUsers,
                totalPredictions,
                activePredictions,
                totalPointsAwarded: totalPoints,
                activeUsers: totalUsers, // Simplified for now
                pendingFeedback: 0 // Could add real count later
            }
        });
    }
    catch (error) {
        console.error('Homepage stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map