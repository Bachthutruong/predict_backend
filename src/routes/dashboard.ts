import express from 'express';
import User from '@/models/user';
import Prediction from '@/models/prediction';
import PointTransaction from '@/models/point-transaction';

const router = express.Router();

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    // Get platform stats
    const [totalUsers, totalPredictions, activePredictions, totalPointsResult] = await Promise.all([
      User.countDocuments(),
      Prediction.countDocuments(),
      Prediction.countDocuments({ status: 'active' }),
      User.aggregate([
        { $group: { _id: null, total: { $sum: '$points' } } }
      ])
    ]);

    const totalPoints = totalPointsResult[0]?.total || 0;

    // Get recent predictions
    const recentPredictions = await Prediction.find({ status: 'active' })
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
  } catch (error) {
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
      User.countDocuments(),
      Prediction.countDocuments(),
      Prediction.countDocuments({ status: 'active' }),
      User.aggregate([{ $group: { _id: null, totalPoints: { $sum: '$points' } } }])
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
  } catch (error) {
    console.error('Homepage stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 