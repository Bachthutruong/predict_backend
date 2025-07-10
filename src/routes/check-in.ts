import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import User from '../models/user';
import Question from '../models/question';
import CheckIn from '../models/check-in';

const router = express.Router();

// Check today's check-in status
router.get('/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingCheckIn = await CheckIn.findOne({
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
  } catch (error) {
    console.error('Check status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET a public question for guests
router.get('/question/public', async (req, res) => {
  try {
    // Fetch one random active question
    const question = await Question.aggregate([
      { $match: { status: 'active' } },
      { $sample: { size: 1 } }
    ]);

    if (!question || question.length === 0) {
      return res.status(404).json({ success: false, message: 'No active questions available' });
    }

    // Don't expose the answer
    const publicQuestion = {
      id: question[0]._id,
      questionText: question[0].questionText,
      imageUrl: question[0].imageUrl,
      points: question[0].points,
    };

    res.json({ success: true, data: publicQuestion });
  } catch (error) {
    console.error('Get public question error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET a question for a logged-in user
router.get('/question', authMiddleware, async (req: AuthRequest, res) => {
  try {
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
    const checkIn = new CheckIn({
      userId,
      questionId,
      answer,
      isCorrect: true,
      pointsEarned
    });
    await checkIn.save();

    // Update user points and streak
    const user = await User.findById(userId);
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
  } catch (error) {
    console.error('Submit check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 