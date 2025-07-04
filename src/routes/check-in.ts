import express from 'express';
import { authMiddleware, AuthRequest } from '@/middleware/auth';
import User from '@/models/user';
import Question from '@/models/question';
import CheckIn from '@/models/check-in';

const router = express.Router();

// Get today's question
router.get('/question', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const question = await Question.findOne({ status: 'active' })
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
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Submit check-in
router.post('/submit', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { questionId, answer } = req.body;
    const userId = req.user!.id;

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingCheckIn = await CheckIn.findOne({
      userId,
      checkInDate: { $gte: today }
    });

    if (existingCheckIn) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in today'
      });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const isCorrect = answer.toLowerCase().trim() === question.answer.toLowerCase().trim();
    const pointsEarned = isCorrect ? question.points : Math.floor(question.points / 2);

    // Create check-in record
    const checkIn = new CheckIn({
      userId,
      questionId,
      answer,
      isCorrect,
      pointsEarned
    });
    await checkIn.save();

    // Update user points and streak
    const user = await User.findById(userId);
    if (user) {
      user.points += pointsEarned;
      user.consecutiveCheckIns = isCorrect ? user.consecutiveCheckIns + 1 : 0;
      user.lastCheckInDate = new Date();
      await user.save();
    }

    res.json({
      success: true,
      data: {
        isCorrect,
        pointsEarned,
        correctAnswer: question.answer
      },
      message: isCorrect ? 'Correct! Points earned!' : 'Incorrect, but you still earned some points!'
    });
  } catch (error) {
    console.error('Submit check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 