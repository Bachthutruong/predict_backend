import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkPredictionViewAccess } from '../middleware/predictionAuth';
import Prediction from '../models/prediction';
import UserPrediction from '../models/user-prediction';
import User from '../models/user';
import PointTransaction from '../models/point-transaction';
import { decrypt } from '../utils/encryption';
import UserSuggestion from '../models/UserSuggestion';
import { getCache, setCache, clearCache, isCacheValid } from '../utils/cache';

// Extend AuthRequest to include prediction and canViewAnswer
interface PredictionAuthRequest extends AuthRequest {
  prediction?: any;
  canViewAnswer?: boolean;
}

const router = express.Router();

// Cache is now managed by utils/cache.ts

// Get all active predictions
router.get('/', async (req, res) => {
  try {
    // Check cache first
    if (isCacheValid()) {
      const { cache } = getCache();
      return res.json({
        success: true,
        data: cache,
        cached: true
      });
    }

    // Fetch from database with optimized query - include both active and finished predictions
    const predictions = await Prediction.find({ status: { $in: ['active', 'finished'] } })
      .populate('authorId', 'name')
      .populate('winnerId', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .lean() // Use lean() for better performance
      .exec();

    // Transform the data to match frontend expectations
    const transformedPredictions = predictions.map(prediction => ({
      ...prediction,
      id: (prediction as any)._id.toString() // Ensure ID is properly set
    }));

    // Update cache
    setCache(transformedPredictions);

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
router.get('/:id', checkPredictionViewAccess as any, async (req: any, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    const prediction = await Prediction.findById(req.params.id)
      .populate('authorId', 'name')
      .populate('winnerId', 'name avatarUrl');
    const canViewAnswer = req.canViewAnswer!;

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

    const predictionObj = prediction.toObject();
    res.json({
      success: true,
      data: {
        prediction: {
          ...predictionObj,
          id: predictionObj._id.toString(), // Ensure ID is properly set
          answer: canViewAnswer ? prediction.getDecryptedAnswer() : '***ENCRYPTED***',
          rewardPoints: prediction.rewardPoints,
          pointsCost: prediction.pointsCost,
          createdAt: predictionObj.createdAt
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
router.post('/:id/submit', authenticate, async (req: AuthRequest, res) => {
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

    // Check if user already has a correct prediction for this prediction
    const existingCorrectPrediction = await UserPrediction.findOne({
      userId,
      predictionId,
      isCorrect: true
    });

    if (existingCorrectPrediction) {
      return res.status(400).json({
        success: false,
        message: 'You have already predicted correctly for this prediction!'
      });
    }

    const user = await User.findById(userId);
    if (!user || user.points < prediction.pointsCost) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient points'
      });
    }

    // Check if guess is correct - decrypt answer first
    const decryptedAnswer = prediction.getDecryptedAnswer();
    const isCorrect = guess.toLowerCase().trim() === decryptedAnswer.toLowerCase().trim();
    
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

    // If correct, award bonus points and CLOSE the prediction immediately
    if (isCorrect) {
      const bonusPoints = prediction.rewardPoints || Math.round(prediction.pointsCost * 1.5);
      user.points += bonusPoints;
      await user.save();

      // Mark prediction finished and set winner (but keep it visible)
      prediction.status = 'finished';
      prediction.winnerId = user._id;
      await prediction.save();

      // Clear active cache so list updates instantly
      clearCache();

      // Record the transaction
      await PointTransaction.create({
        userId: userId,
        adminId: prediction.authorId, // Use prediction author as admin for transaction
        amount: bonusPoints,
        reason: 'prediction-win',
        notes: `Correct prediction: ${prediction.title}`
      });

      return res.json({
        success: true,
        data: { 
          isCorrect: true, 
          bonusPoints,
          pointsCost: prediction.pointsCost,
          totalPointsEarned: bonusPoints - prediction.pointsCost
        },
        message: `Chính xác! Bạn đã dự đoán đúng, dự đoán đã kết thúc và bạn nhận được ${bonusPoints} điểm thưởng!`
      });
    }

    res.json({
      success: true,
      data: { 
        isCorrect: false,
        pointsCost: prediction.pointsCost,
        message: `Dự đoán không đúng. Bạn đã trừ ${prediction.pointsCost} điểm. Hãy thử lại!`
      },
      message: 'Dự đoán đã được gửi thành công!'
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

// Use a hint from user's suggestion packages for a prediction
router.post('/:id/use-hint', authenticate, async (req: AuthRequest, res) => {
  try {
    const predictionId = req.params.id;
    const userId = req.user!.id;

    const prediction = await Prediction.findById(predictionId);
    if (!prediction) {
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    }

    // Pick an active user suggestion package with remaining > 0
    const now = new Date();
    const userSuggestion = await UserSuggestion.findOne({
      user: userId,
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      remainingSuggestions: { $gt: 0 },
    }).sort({ createdAt: 1 });

    if (!userSuggestion) {
      return res.status(400).json({ success: false, message: 'Bạn không còn lượt gợi ý. Vui lòng mua gói gợi ý.' });
    }

    // Consume one suggestion
    userSuggestion.usedSuggestions += 1;
    userSuggestion.remainingSuggestions = Math.max(0, userSuggestion.totalSuggestions - userSuggestion.usedSuggestions);
    await userSuggestion.save();

    // Build a safe hint from prediction data
    const rawHint: string = (prediction as any)['data-ai-hint'] || '';
    const baseHint = rawHint && typeof rawHint === 'string' ? rawHint : '';

    // Generate varied, question-related hints from title/description
    const textPool = [prediction.title || '', prediction.description || '']
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/g, ' ');
    const words = Array.from(new Set(textPool.split(/\s+/).filter(w => w.length >= 4))).slice(0, 12);
    const keywords = words.slice(0, 6);

    const pick = (idx: number, arr: string[]) => (arr.length ? arr[idx % arr.length] : '');
    const k1 = pick(0, keywords);
    const k2 = pick(1, keywords);
    const k3 = pick(2, keywords);

    const candidates: string[] = [
      baseHint || '',
      k1 ? `Hãy tập trung vào từ khóa: "${k1}".` : '',
      k2 ? `Trong mô tả có chi tiết liên quan đến "${k2}".` : '',
      k3 ? `Xem lại phần mở đầu, có gợi ý về "${k3}".` : '',
      'Đối chiếu tiêu đề với mô tả để tìm mấu chốt.',
      'Loại trừ những đáp án mâu thuẫn với mô tả.',
      'Tìm số liệu, thời gian hoặc tên riêng trong mô tả.',
      prediction.title ? `Từ tiêu đề: "${prediction.title}", rút ra ý chính rồi so sánh với đáp án của bạn.` : '',
    ].filter(Boolean);

    // Rotate hint by current usedSuggestions to avoid repeating the same text many times
    const indexSeed = userSuggestion.usedSuggestions - 1; // just consumed one above
    const hint = candidates[candidates.length ? (indexSeed % candidates.length + candidates.length) % candidates.length : 0] || 'Gợi ý: Xem kỹ các chi tiết quan trọng trong mô tả.';

    return res.json({
      success: true,
      data: {
        hint,
        remaining: userSuggestion.remainingSuggestions,
        total: userSuggestion.totalSuggestions,
      }
    });
  } catch (error) {
    console.error('Use hint error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});