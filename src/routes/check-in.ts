import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import User from '../models/user';
import Question from '../models/question';
import CheckIn from '../models/check-in';

const router = express.Router();

// Check today's check-in status
router.get('/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingCheckIn = await CheckIn.findOne({
      userId,
      checkInDate: { $gte: today }
    });

    // Load user to calculate current streak for display
    const user = await User.findById(userId);

    if (existingCheckIn) {
      // Handle special case: user completed day 7 today; stored streak is reset to 0
      let displayConsecutiveCheckIns = user?.consecutiveCheckIns || 0;
      if ((user?.consecutiveCheckIns || 0) === 0) {
        displayConsecutiveCheckIns = 7;
      }
      return res.json({
        success: true,
        data: {
          hasCheckedIn: true,
          isCorrect: existingCheckIn.isCorrect,
          pointsEarned: existingCheckIn.pointsEarned,
          consecutiveCheckIns: user?.consecutiveCheckIns || 0,
          displayConsecutiveCheckIns
        }
      });
    }

    res.json({
      success: true,
      data: {
        hasCheckedIn: false,
        consecutiveCheckIns: user?.consecutiveCheckIns || 0
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
router.get('/question/public', authenticate, async (req, res) => {
  try {
    // Fetch one random active question
    const question = await Question.aggregate([
      { $match: { status: 'active' } },
      { $sample: { size: 1 } }
    ]);

    if (!question || question.length === 0) {
      return res.status(404).json({ success: false, message: 'No active questions available' });
    }

    // Update display count for the question
    await Question.findByIdAndUpdate(question[0]._id, {
      $inc: { displayCount: 1 }
    });

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
router.get('/question', authenticate, async (req: AuthRequest, res) => {
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

    // Get user info to check answered questions
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // First try to get priority questions that haven't been answered
    let question = await Question.findOne({ 
      status: 'active',
      isPriority: true,
      _id: { $nin: user.answeredQuestionIds }
    }).sort({ displayCount: 1 });

    // If no priority questions available, get any active question not answered
    if (!question) {
      question = await Question.findOne({ 
        status: 'active',
        _id: { $nin: user.answeredQuestionIds }
      }).sort({ isPriority: -1, displayCount: 1 });
    }

    // If still no question, reset answered questions and get any active question
    if (!question) {
      await User.findByIdAndUpdate(userId, {
        $set: { answeredQuestionIds: [] }
      });
      
      question = await Question.findOne({ status: 'active' })
        .sort({ isPriority: -1, displayCount: 1 });
    }

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'No question available'
      });
    }

    // Update display count for the question
    await Question.findByIdAndUpdate(question._id, {
      $inc: { displayCount: 1 }
    });

    res.json({
      success: true,
      data: {
        ...question.toObject(),
        skipCount: user.skipCount,
        maxSkips: user.maxSkips,
        consecutiveCheckIns: user.consecutiveCheckIns
      }
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
router.post('/submit', authenticate, async (req: AuthRequest, res) => {
  try {
    console.log('Submit check-in request:', req.body);
    const { questionId, answer, action } = req.body; // action: 'answer' or 'skip'
    const userId = req.user!.id;
    console.log('User ID:', userId, 'Action:', action);

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

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Handle skip action
    if (action === 'skip') {
      if (user.skipCount >= user.maxSkips) {
        return res.status(400).json({
          success: false,
          message: 'You have used all your skip attempts for today'
        });
      }

      // Update user skip count
      user.skipCount += 1;
      await user.save();

      // Add question to answered list
      if (!user.answeredQuestionIds.includes(questionId)) {
        user.answeredQuestionIds.push(questionId);
        await user.save();
      }

      return res.json({
        success: true,
        data: {
          action: 'skipped',
          skipCount: user.skipCount,
          maxSkips: user.maxSkips,
          message: `Question skipped! You have ${user.maxSkips - user.skipCount} skips remaining.`
        }
      });
    }

    // Handle answer submission
    const isCorrect = answer.toLowerCase().trim() === question.answer.toLowerCase().trim();
    
    // Update display count for the question (regardless of correctness)
    await Question.findByIdAndUpdate(questionId, {
      $inc: { displayCount: 1 }
    });
    
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
    let streakBonus = 0;
    let newStreakCount = 1; // Start with 1 for today
    let displayConsecutiveCheckIns: number | undefined = undefined; // For UI display only

    // Check if this is consecutive day
    const todayForStreak = new Date();
    todayForStreak.setHours(0, 0, 0, 0);
    
    if (user.lastCheckInDate) {
      const lastCheckInDate = new Date(user.lastCheckInDate);
      lastCheckInDate.setHours(0, 0, 0, 0);
      
      const daysDifference = Math.floor((todayForStreak.getTime() - lastCheckInDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference === 1) {
        // Consecutive day - continue streak
        newStreakCount = user.consecutiveCheckIns + 1;
      } else if (daysDifference > 1) {
        // Not consecutive - reset streak
        newStreakCount = 1;
      }
      // If daysDifference === 0, user already checked in today (handled above)
    }

    // Check for 7-day streak bonus
    if (newStreakCount === 7) {
      streakBonus = 300;
      // Show 7/7 to the user for today, but reset stored streak to 0
      displayConsecutiveCheckIns = 7;
      newStreakCount = 0;
    }

    // Create check-in record (only for correct answers)
    const checkIn = new CheckIn({
      userId,
      questionId,
      answer,
      isCorrect: true,
      pointsEarned: pointsEarned + streakBonus
    });
    await checkIn.save();

    // Update user points, streak, and answered questions
    user.points += pointsEarned + streakBonus;
    user.consecutiveCheckIns = newStreakCount;
    user.lastCheckInDate = new Date();
    
    // Add question to answered list
    if (!user.answeredQuestionIds.includes(questionId)) {
      user.answeredQuestionIds.push(questionId);
    }
    
    await user.save();

    // Update question statistics (only correctAnswerCount since displayCount was already updated)
    await Question.findByIdAndUpdate(questionId, {
      $inc: {
        correctAnswerCount: 1
      }
    });

    // Determine message based on streak status
    let message = '';
    if (streakBonus > 0) {
      message = `Chính xác! Điểm kiếm được: ${pointsEarned} + Bonus chuỗi 7 ngày: ${streakBonus} = ${pointsEarned + streakBonus} điểm! Chuỗi đã reset về 0.`;
    } else if (newStreakCount === 1 && user.consecutiveCheckIns > 1) {
      message = `Chính xác! Điểm kiếm được: ${pointsEarned}. Chuỗi đã bị reset vì không liên tiếp.`;
    } else {
      message = `Chính xác! Điểm kiếm được: ${pointsEarned}. Chuỗi hiện tại: ${newStreakCount}/7 ngày.`;
    }

    res.json({
      success: true,
      data: {
        isCorrect: true,
        pointsEarned,
        streakBonus,
        totalPointsEarned: pointsEarned + streakBonus,
        consecutiveCheckIns: newStreakCount,
        // Provide a display-only streak value for the frontend to show 7/7 today
        ...(displayConsecutiveCheckIns !== undefined ? { displayConsecutiveCheckIns } : {}),
        correctAnswer: question.answer
      },
      message
    });
  } catch (error) {
    console.error('Submit check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Reset skip count daily
router.post('/reset-skips', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if skip count was already reset today
    if (user.lastSkipResetDate && user.lastSkipResetDate >= today) {
      return res.json({
        success: true,
        data: {
          skipCount: user.skipCount,
          maxSkips: user.maxSkips,
          message: 'Skip count already reset today'
        }
      });
    }

    // Reset skip count
    user.skipCount = 0;
    user.lastSkipResetDate = today;
    await user.save();

    res.json({
      success: true,
      data: {
        skipCount: user.skipCount,
        maxSkips: user.maxSkips,
        message: 'Skip count reset successfully'
      }
    });
  } catch (error) {
    console.error('Reset skip count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 