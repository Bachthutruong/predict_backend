import express from 'express';
import { authMiddleware, AuthRequest } from '@/middleware/auth';
import Feedback from '@/models/feedback';

const router = express.Router();

// Submit feedback
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { feedbackText } = req.body;

    const feedback = new Feedback({
      userId: req.user!.id,
      feedbackText
    });

    await feedback.save();

    res.status(201).json({
      success: true,
      data: feedback,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get user's feedback
router.get('/my', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const feedback = await Feedback.find({ userId: req.user!.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 