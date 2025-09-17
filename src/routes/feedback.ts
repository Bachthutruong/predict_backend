import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Feedback from '../models/feedback';

const router = express.Router();

// Submit feedback
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { feedbackText } = req.body;

    const feedback = new Feedback({
      userId: req.user!.id,
      feedbackText
    });

    await feedback.save();

    // Transform the data to match frontend expectations
    const transformedFeedback = {
      ...feedback.toObject(),
      id: feedback._id.toString() // Ensure ID is properly set
    };

    res.status(201).json({
      success: true,
      data: transformedFeedback,
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
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const feedback = await Feedback.find({ userId: req.user!.id })
      .sort({ createdAt: -1 });

    // Transform the data to match frontend expectations
    const transformedFeedback = feedback.map(item => {
      const obj = item.toObject();
      return {
        ...obj,
        id: obj._id.toString() // Ensure ID is properly set
      };
    });

    res.json({
      success: true,
      data: transformedFeedback
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