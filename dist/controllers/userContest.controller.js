"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContestHistory = exports.submitContestAnswer = exports.getContestDetails = exports.getActiveContests = void 0;
const contest_1 = __importDefault(require("../models/contest"));
const user_contest_1 = __importDefault(require("../models/user-contest"));
const user_1 = __importDefault(require("../models/user"));
const mongoose_1 = __importDefault(require("mongoose"));
// @desc    Get all active contests
// @route   GET /api/contests
// @access  Public
const getActiveContests = async (req, res) => {
    try {
        // Lấy tất cả contests, filter status theo thời gian và isAnswerPublished giống FE
        const now = new Date();
        const nowGMT7 = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        const contests = await contest_1.default.find({
            startDate: { $lte: nowGMT7 },
            endDate: { $gte: nowGMT7 },
            isAnswerPublished: false
        })
            .populate('authorId', 'name')
            .sort({ createdAt: -1 })
            .lean();
        // Transform the data to match frontend expectations
        const transformedContests = contests.map(contest => ({
            ...contest,
            id: contest._id.toString()
        }));
        res.json({
            success: true,
            data: transformedContests
        });
    }
    catch (error) {
        console.error('Get active contests error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
exports.getActiveContests = getActiveContests;
// @desc    Get contest details
// @route   GET /api/contests/:id
// @access  Public
const getContestDetails = async (req, res) => {
    try {
        // Validate ObjectId
        if (!mongoose_1.default.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid contest ID'
            });
        }
        const { page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const contest = await contest_1.default.findById(req.params.id)
            .populate('authorId', 'name avatarUrl')
            .lean();
        if (!contest) {
            return res.status(404).json({
                success: false,
                message: 'Contest not found'
            });
        }
        // Get user's submission for this contest (only if user is authenticated)
        let userSubmission = null;
        let userSubmissions = [];
        let userSubmissionsTotal = 0;
        let userSubmissionsTotalPages = 0;
        if (req.user) {
            userSubmission = await user_contest_1.default.findOne({
                contestId: req.params.id,
                userId: req.user.id
            }).lean();
            // Always return all user submissions for this contest
            userSubmissions = await user_contest_1.default.find({
                contestId: req.params.id,
                userId: req.user.id
            })
                .populate('contestId')
                .populate('userId', 'name avatarUrl')
                .sort({ createdAt: -1 })
                .lean();
            userSubmissionsTotal = userSubmissions.length;
            userSubmissionsTotalPages = 1;
        }
        // Get paginated submissions (always, not just when answer is published)
        let submissions = [];
        let totalSubmissions = 0;
        let totalPages = 0;
        const contestSubmissions = await user_contest_1.default.find({ contestId: req.params.id })
            .populate('userId', 'name avatarUrl')
            .sort({ createdAt: -1 })
            .limit(limitNum)
            .skip((pageNum - 1) * limitNum)
            .lean();
        totalSubmissions = await user_contest_1.default.countDocuments({ contestId: req.params.id });
        totalPages = Math.ceil(totalSubmissions / limitNum);
        // Transform submissions to match frontend expectations
        submissions = contestSubmissions.map((sub) => ({
            ...sub,
            id: sub._id.toString(),
            user: sub.userId
        }));
        res.json({
            success: true,
            data: {
                contest: {
                    ...contest,
                    id: contest._id.toString()
                },
                userSubmission: userSubmission ? {
                    ...userSubmission,
                    id: userSubmission._id.toString()
                } : null,
                userSubmissions: userSubmissions.map((sub) => ({
                    ...sub,
                    id: sub._id.toString(),
                    contest: sub.contestId,
                    user: sub.userId
                })),
                userSubmissionsTotal,
                userSubmissionsTotalPages,
                submissions,
                totalSubmissions,
                totalPages
            }
        });
    }
    catch (error) {
        console.error('Get contest details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
exports.getContestDetails = getContestDetails;
// @desc    Submit answer to contest
// @route   POST /api/contests/:id/submit
// @access  Private
const submitContestAnswer = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    try {
        await session.startTransaction();
        const { answer } = req.body;
        const userId = req.user.id;
        if (!answer || answer.trim() === '') {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Answer is required' });
        }
        const contest = await contest_1.default.findById(req.params.id).session(session);
        if (!contest) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Contest not found' });
        }
        const now = new Date();
        const nowGMT7 = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        if (nowGMT7 < contest.startDate || nowGMT7 > contest.endDate || contest.isAnswerPublished) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Contest is not active or has ended' });
        }
        // Deduct points atomically and check
        const updatedUser = await user_1.default.findOneAndUpdate({ _id: userId, points: { $gte: contest.pointsPerAnswer } }, { $inc: { points: -contest.pointsPerAnswer } }, { session, new: true });
        if (!updatedUser) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Insufficient points to participate' });
        }
        // Log point transaction
        const PointTransaction = require('../models/point-transaction').default;
        await PointTransaction.create([{
                userId: userId,
                amount: -contest.pointsPerAnswer,
                reason: 'contest-participation',
                notes: `Participated in contest: ${contest.title}`
            }], { session });
        // Create submission
        const submission = new user_contest_1.default({
            contestId: req.params.id,
            userId: userId,
            answer: answer.trim(),
            pointsSpent: contest.pointsPerAnswer,
            isCorrect: false,
            rewardPointsEarned: 0
        });
        await submission.save({ session });
        await session.commitTransaction();
        res.json({
            success: true,
            message: 'Answer submitted successfully',
            data: {
                submission: {
                    ...submission.toObject(),
                    id: submission._id.toString()
                },
                remainingPoints: updatedUser.points
            }
        });
    }
    catch (error) {
        try {
            await session.abortTransaction();
        }
        catch (e) { }
        res.status(500).json({ success: false, message: 'Server error' });
    }
    finally {
        session.endSession();
    }
};
exports.submitContestAnswer = submitContestAnswer;
// @desc    Get user's contest history
// @route   GET /api/contests/history
// @access  Private
const getContestHistory = async (req, res) => {
    try {
        const { page = 1, limit = 20, contestId } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const userId = req.user.id;
        // Get user's contest submissions, filter by contestId if provided
        const query = { userId };
        if (contestId) {
            query.contestId = contestId;
        }
        const submissions = await user_contest_1.default.find(query)
            .populate('contestId')
            .populate('userId', 'name avatarUrl')
            .sort({ createdAt: -1 })
            .limit(limitNum)
            .skip((pageNum - 1) * limitNum)
            .lean();
        const totalSubmissions = await user_contest_1.default.countDocuments(query);
        const totalPages = Math.ceil(totalSubmissions / limitNum);
        // Transform submissions
        const transformedSubmissions = submissions.map(sub => ({
            ...sub,
            id: sub._id.toString(),
            contest: sub.contestId,
            user: sub.userId
        }));
        res.json({
            success: true,
            data: {
                submissions: transformedSubmissions,
                totalSubmissions,
                totalPages,
                currentPage: pageNum
            }
        });
    }
    catch (error) {
        console.error('Get contest history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
exports.getContestHistory = getContestHistory;
//# sourceMappingURL=userContest.controller.js.map