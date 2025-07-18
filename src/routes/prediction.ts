import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import Prediction from '../models/prediction';
import UserPrediction from '../models/user-prediction';
import User from '../models/user';

const router = express.Router();

// Simple in-memory cache for active predictions (5 minutes)
let activePredictionsCache: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get all active predictions
router.get('/', async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (activePredictionsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return res.json({
        success: true,
        data: activePredictionsCache,
        cached: true
      });
    }

    // Fetch from database with optimized query
    const predictions = await Prediction.find({ status: 'active' })
      .populate('authorId', 'name')
      .sort({ createdAt: -1 })
      .lean() // Use lean() for better performance
      .exec();

    // Transform the data to match frontend expectations
    const transformedPredictions = predictions.map(prediction => ({
      ...prediction,
      id: (prediction as any)._id.toString() // Ensure ID is properly set
    }));

    // Update cache
    activePredictionsCache = transformedPredictions;
    cacheTimestamp = now;

    res.json({
      success: true,
      data: transformedPredictions,
      cached: false
    });
  } catch (error) {
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
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    // Optimize query with lean() and select only needed fields
    const prediction = await Prediction.findById(req.params.id)
      .populate('authorId', 'name avatarUrl')
      .populate('winnerId', 'name avatarUrl')
      .lean()
      .exec();

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    // Get paginated user predictions with optimized query
    const userPredictions = await UserPrediction.find({ predictionId: req.params.id })
      .populate('userId', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean()
      .exec();

    // Get total count for pagination (use countDocuments for better performance)
    const totalUserPredictions = await UserPrediction.countDocuments({ predictionId: req.params.id });
    const totalPages = Math.ceil(totalUserPredictions / limitNum);

    // Transform user predictions to match frontend expectations
    const transformedUserPredictions = userPredictions.map(up => ({
      ...up,
      id: (up as any)._id.toString(), // Ensure ID is properly set
      user: up.userId
    }));

    res.json({
      success: true,
      data: {
        prediction: {
          ...prediction,
          id: (prediction as any)._id.toString() // Ensure ID is properly set
        },
        userPredictions: transformedUserPredictions,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get prediction details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Submit prediction
router.post('/:id/submit', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { guess } = req.body;
    const predictionId = req.params.id;
    const userId = req.user!.id;

    const prediction = await Prediction.findById(predictionId);
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

    const user = await User.findById(userId);
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
    const userPrediction = new UserPrediction({
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

      // Clear cache when prediction status changes
      activePredictionsCache = null;

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
  } catch (error) {
    console.error('Submit prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 