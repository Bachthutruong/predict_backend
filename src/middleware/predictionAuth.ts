import { Request, Response, NextFunction } from 'express';
import Prediction from '../models/prediction';
import { AuthRequest } from '../types';

// Extend AuthRequest to include prediction and canViewAnswer
interface PredictionAuthRequest extends AuthRequest {
  prediction?: any;
  canViewAnswer?: boolean;
}

/**
 * Middleware to check if the current user is the author of a prediction
 * This ensures only the prediction author can view/edit the answer
 */
export const checkPredictionAuthor = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const prediction = await Prediction.findById(id);
    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    // Check if current user is the author
    if (!prediction.isAuthor(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only the prediction author can perform this action.'
      });
    }

    // Add prediction to request object for use in route handlers
    req.prediction = prediction;
    next();
  } catch (error) {
    console.error('Prediction author check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Middleware to check if the current user can view prediction details
 * Authors can see decrypted answers, others see encrypted answers
 */
export const checkPredictionViewAccess = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const prediction = await Prediction.findById(id);
    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    // Add prediction and access level to request object
    req.prediction = prediction;
    req.canViewAnswer = userId ? prediction.isAuthor(userId) : false;
    next();
  } catch (error) {
    console.error('Prediction view access check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
