"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const predictionAuth_1 = require("../middleware/predictionAuth");
const prediction_1 = __importDefault(require("../models/prediction"));
const user_prediction_1 = __importDefault(require("../models/user-prediction"));
const user_1 = __importDefault(require("../models/user"));
const point_transaction_1 = __importDefault(require("../models/point-transaction"));
const Product_1 = __importDefault(require("../models/Product"));
const InventoryLog_1 = __importDefault(require("../models/InventoryLog"));
const UserSuggestion_1 = __importDefault(require("../models/UserSuggestion"));
const cache_1 = require("../utils/cache");
const router = express_1.default.Router();
// Cache is now managed by utils/cache.ts
// Chuẩn hóa chuỗi để so sánh đáp án
function normalizeAnswer(val) {
    const s = val == null ? '' : String(val);
    return s
        .normalize('NFKC')
        .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}
function answersMatch(guess, correct) {
    const a = normalizeAnswer(guess);
    const b = normalizeAnswer(correct);
    if (a === '' && b === '')
        return false;
    return a === b;
}
// Helper: check if prediction is currently "active" (within time window if set)
function isPredictionActive(p) {
    if (p.status !== 'active')
        return false;
    const now = new Date();
    if (p.startDate && new Date(p.startDate) > now)
        return false;
    if (p.endDate && new Date(p.endDate) < now)
        return false;
    return true;
}
// Get all active predictions (filter by time: no dates = always, or within startDate-endDate)
router.get('/', async (req, res) => {
    try {
        // Check cache first
        if ((0, cache_1.isCacheValid)()) {
            const { cache } = (0, cache_1.getCache)();
            return res.json({
                success: true,
                data: cache,
                cached: true
            });
        }
        const now = new Date();
        const predictions = await prediction_1.default.find({ status: { $in: ['active', 'finished'] } })
            .populate('authorId', 'name')
            .populate('winnerId', 'name avatarUrl')
            .populate('winnerIds', 'name avatarUrl')
            .populate({ path: 'rewards.productId', model: 'Product', select: 'name images stock' })
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        const winnerCounts = await user_prediction_1.default.aggregate([
            { $match: { isCorrect: true } },
            { $group: { _id: '$predictionId', count: { $sum: 1 } } }
        ]);
        const winnerMap = Object.fromEntries(winnerCounts.map((w) => [w._id.toString(), w.count]));
        const transformedPredictions = predictions.map((prediction) => {
            const p = {
                ...prediction,
                id: prediction._id.toString(),
                winnerCount: winnerMap[prediction._id.toString()] || 0,
                maxWinners: prediction.maxWinners ?? 1
            };
            p.isCurrentlyActive = isPredictionActive(prediction);
            return p;
        });
        (0, cache_1.setCache)(transformedPredictions);
        res.json({
            success: true,
            data: transformedPredictions,
            cached: false
        });
    }
    catch (error) {
        console.error('Get predictions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Get prediction details - optionalAuthenticate để có userAttemptCount khi user đăng nhập
router.get('/:id', auth_1.optionalAuthenticate, predictionAuth_1.checkPredictionViewAccess, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const canViewAnswer = req.canViewAnswer; // Admin/author can see answer
        const isAdminOrAuthor = canViewAnswer;
        const prediction = await prediction_1.default.findById(req.params.id)
            .populate('authorId', 'name')
            .populate('winnerId', 'name avatarUrl')
            .populate('winnerIds', 'name avatarUrl')
            .populate({ path: 'rewards.productId', model: 'Product', select: 'name images stock' });
        if (!prediction) {
            return res.status(404).json({ success: false, message: 'Prediction not found' });
        }
        const predictionObj = prediction.toObject();
        const winnerCount = await user_prediction_1.default.countDocuments({ predictionId: req.params.id, isCorrect: true });
        const maxWinners = predictionObj.maxWinners ?? 1;
        // Tự động kết thúc khi hết thời gian (endDate đã qua)
        const now = new Date();
        if (prediction.status === 'active' && predictionObj.endDate && new Date(predictionObj.endDate) < now) {
            await prediction_1.default.findByIdAndUpdate(req.params.id, { status: 'finished' });
            predictionObj.status = 'finished';
            prediction.status = 'finished';
        }
        // Get paginated user predictions
        const userPredictions = await user_prediction_1.default.find({ predictionId: req.params.id })
            .populate('userId', 'name avatarUrl')
            .sort({ createdAt: -1 })
            .limit(limitNum)
            .skip((pageNum - 1) * limitNum)
            .lean()
            .exec();
        const totalUserPredictions = await user_prediction_1.default.countDocuments({ predictionId: req.params.id });
        const totalPages = Math.ceil(totalUserPredictions / limitNum);
        // Chỉ admin/author thấy đúng/sai từng dự đoán; user chỉ thấy x/a người đã trúng
        const canViewCorrectness = isAdminOrAuthor;
        const transformedUserPredictions = userPredictions.map((up) => {
            const item = { ...up, id: up._id.toString(), user: up.userId };
            if (!canViewCorrectness) {
                delete item.isCorrect; // User không biết đúng/sai
            }
            return item;
        });
        const userId = req.user?.id;
        let userAttemptCount = 0;
        let userPredictionsForUser = [];
        if (userId) {
            userAttemptCount = await user_prediction_1.default.countDocuments({ userId, predictionId: req.params.id });
            userPredictionsForUser = await user_prediction_1.default.find({ userId, predictionId: req.params.id })
                .sort({ createdAt: -1 })
                .lean();
        }
        res.json({
            success: true,
            data: {
                prediction: {
                    ...predictionObj,
                    id: predictionObj._id.toString(),
                    answer: canViewAnswer ? prediction.getDecryptedAnswer() : '***ENCRYPTED***',
                    rewardPoints: prediction.rewardPoints,
                    pointsCost: prediction.pointsCost,
                    winnerCount,
                    maxWinners: prediction.maxWinners ?? 1,
                    maxAttemptsPerUser: prediction.maxAttemptsPerUser ?? 999,
                    isCurrentlyActive: isPredictionActive(predictionObj),
                    isAnswerPublished: predictionObj.isAnswerPublished ?? false,
                    startDate: predictionObj.startDate,
                    endDate: predictionObj.endDate,
                    rewards: predictionObj.rewards || [],
                    createdAt: predictionObj.createdAt
                },
                userPredictions: transformedUserPredictions,
                totalPages,
                userAttemptCount,
                userPredictionsForUser: userPredictionsForUser.map((up) => {
                    const item = { ...up, id: up._id.toString() };
                    if (!canViewCorrectness)
                        delete item.isCorrect;
                    return item;
                })
            }
        });
    }
    catch (error) {
        console.error('Get prediction details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// Submit prediction - KHÔNG tiết lộ đúng/sai cho user cho đến khi admin publish answer
router.post('/:id/submit', auth_1.authenticate, async (req, res) => {
    try {
        const { guess } = req.body;
        const predictionId = req.params.id;
        const userId = req.user.id;
        const prediction = await prediction_1.default.findById(predictionId);
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
        const predObj = prediction.toObject();
        const now = new Date();
        if (predObj.startDate && new Date(predObj.startDate) > now) {
            return res.status(400).json({ success: false, message: 'Prediction has not started yet' });
        }
        if (predObj.endDate && new Date(predObj.endDate) < now) {
            return res.status(400).json({ success: false, message: 'Prediction has ended' });
        }
        const maxAttempts = predObj.maxAttemptsPerUser ?? 999;
        const userAttemptCount = await user_prediction_1.default.countDocuments({ userId, predictionId });
        if (userAttemptCount >= maxAttempts) {
            return res.status(400).json({
                success: false,
                message: `Bạn đã dùng hết ${maxAttempts} lượt dự đoán cho dự đoán này`
            });
        }
        const user = await user_1.default.findById(userId);
        if (!user || user.points < prediction.pointsCost) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient points'
            });
        }
        const correctAnswer = prediction.getDecryptedAnswer();
        const isCorrect = answersMatch(guess.trim(), correctAnswer);
        const maxWinners = predObj.maxWinners ?? 1;
        user.points -= prediction.pointsCost;
        await user.save();
        const userPrediction = new user_prediction_1.default({
            userId,
            predictionId,
            guess: guess.trim(),
            isCorrect,
            pointsSpent: prediction.pointsCost
        });
        await userPrediction.save();
        if (isCorrect) {
            const winnerCount = await user_prediction_1.default.countDocuments({ predictionId, isCorrect: true });
            if (winnerCount <= maxWinners) {
                const mongoose = require('mongoose');
                const session = await mongoose.startSession();
                session.startTransaction();
                try {
                    const rewards = predObj.rewards || [];
                    let pointsToAward = predObj.rewardPoints || Math.round(predObj.pointsCost * 1.5);
                    if (rewards.length > 0) {
                        pointsToAward = 0;
                        for (const r of rewards) {
                            if (r.type === 'points' && r.pointsAmount)
                                pointsToAward += r.pointsAmount;
                        }
                    }
                    if (pointsToAward > 0) {
                        await user_1.default.findByIdAndUpdate(userId, { $inc: { points: pointsToAward } }, { session });
                        await point_transaction_1.default.create([{
                                userId,
                                adminId: prediction.authorId,
                                amount: pointsToAward,
                                reason: 'prediction-win',
                                notes: `Dự đoán trúng thưởng: ${prediction.title}`
                            }], { session });
                    }
                    for (const r of rewards) {
                        if (r.type === 'product' && r.productId && r.productQuantity) {
                            const product = await Product_1.default.findById(r.productId).session(session);
                            if (product && product.stock >= r.productQuantity) {
                                const prevStock = product.stock;
                                await Product_1.default.findByIdAndUpdate(r.productId, { $inc: { stock: -r.productQuantity } }, { session });
                                await InventoryLog_1.default.create([{
                                        product: r.productId,
                                        changeAmount: -r.productQuantity,
                                        previousStock: prevStock,
                                        newStock: prevStock - r.productQuantity,
                                        type: 'export',
                                        reason: 'prediction-win',
                                        note: `Dự đoán trúng: ${prediction.title}`,
                                        performedBy: prediction.authorId
                                    }], { session });
                            }
                        }
                    }
                    const mongooseModule = require('mongoose');
                    const winnerIds = [...(prediction.winnerIds || [])];
                    const alreadyWinner = winnerIds.some((id) => (id?.toString?.() || id) === userId);
                    if (!alreadyWinner) {
                        winnerIds.push(mongooseModule.Types.ObjectId.isValid(userId) ? new mongooseModule.Types.ObjectId(userId) : userId);
                    }
                    const newWinnerCount = winnerIds.length;
                    const shouldEnd = newWinnerCount >= maxWinners;
                    await prediction_1.default.findByIdAndUpdate(predictionId, {
                        winnerIds,
                        winnerId: winnerIds[0],
                        ...(shouldEnd && { status: 'finished' })
                    }, { session });
                    await session.commitTransaction();
                }
                catch (err) {
                    await session.abortTransaction();
                    throw err;
                }
                finally {
                    session.endSession();
                }
            }
        }
        (0, cache_1.clearCache)();
        const remaining = maxAttempts - userAttemptCount - 1;
        res.json({
            success: true,
            data: {
                pointsCost: prediction.pointsCost,
                remainingAttempts: remaining,
                totalAttempts: userAttemptCount + 1,
                isCorrect
            },
            message: isCorrect ? 'Chúc mừng! Bạn đã dự đoán đúng.' : 'Dự đoán đã gửi. Thử lại lần sau nhé!'
        });
    }
    catch (error) {
        console.error('Submit prediction error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
exports.default = router;
// Use a hint from user's suggestion packages for a prediction
router.post('/:id/use-hint', auth_1.authenticate, async (req, res) => {
    try {
        const predictionId = req.params.id;
        const userId = req.user.id;
        const prediction = await prediction_1.default.findById(predictionId);
        if (!prediction) {
            return res.status(404).json({ success: false, message: 'Prediction not found' });
        }
        // Pick an active user suggestion package with remaining > 0
        const now = new Date();
        const userSuggestion = await UserSuggestion_1.default.findOne({
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
        const rawHint = prediction['data-ai-hint'] || '';
        const baseHint = rawHint && typeof rawHint === 'string' ? rawHint : '';
        // Generate varied, question-related hints from title/description
        const textPool = [prediction.title || '', prediction.description || '']
            .join(' ')
            .toLowerCase()
            .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/g, ' ');
        const words = Array.from(new Set(textPool.split(/\s+/).filter(w => w.length >= 4))).slice(0, 12);
        const keywords = words.slice(0, 6);
        const pick = (idx, arr) => (arr.length ? arr[idx % arr.length] : '');
        const k1 = pick(0, keywords);
        const k2 = pick(1, keywords);
        const k3 = pick(2, keywords);
        const candidates = [
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
    }
    catch (error) {
        console.error('Use hint error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
//# sourceMappingURL=prediction.js.map