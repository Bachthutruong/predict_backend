"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPredictionViewAccess = exports.checkPredictionAuthor = void 0;
const prediction_1 = __importDefault(require("../models/prediction"));
/**
 * Middleware to check if the current user is the author of a prediction
 * This ensures only the prediction author can view/edit the answer
 */
const checkPredictionAuthor = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const prediction = await prediction_1.default.findById(id);
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
    }
    catch (error) {
        console.error('Prediction author check error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
exports.checkPredictionAuthor = checkPredictionAuthor;
/**
 * Middleware to check if the current user can view prediction details
 * Authors can see decrypted answers, others see encrypted answers
 */
const checkPredictionViewAccess = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const prediction = await prediction_1.default.findById(id);
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
    }
    catch (error) {
        console.error('Prediction view access check error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
exports.checkPredictionViewAccess = checkPredictionViewAccess;
//# sourceMappingURL=predictionAuth.js.map