import { Request, Response } from 'express';
import Contest from '../models/contest';
import UserContest from '../models/user-contest';
import User from '../models/user';
import mongoose from 'mongoose';

// @desc    Get all active contests
// @route   GET /api/contests
// @access  Public
export const getActiveContests = async (req: Request, res: Response) => {
  try {
    // Lấy tất cả contests, filter status theo thời gian và isAnswerPublished giống FE
    const now = new Date();
    const nowGMT7 = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const contests = await Contest.find({
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
      id: (contest as any)._id.toString()
    }));

    res.json({
      success: true,
      data: transformedContests
    });
  } catch (error) {
    console.error('Get active contests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get contest details
// @route   GET /api/contests/:id
// @access  Public
export const getContestDetails = async (req: Request, res: Response) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contest ID'
      });
    }
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    const contest = await Contest.findById(req.params.id)
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
    let userSubmissions: any[] = [];
    let userSubmissionsTotal = 0;
    let userSubmissionsTotalPages = 0;
    if ((req as any).user) {
      userSubmission = await UserContest.findOne({
        contestId: req.params.id,
        userId: (req as any).user.id
      }).lean();
      // Always return all user submissions for this contest
      userSubmissions = await UserContest.find({
        contestId: req.params.id,
        userId: (req as any).user.id
      })
        .populate('contestId')
        .populate('userId', 'name avatarUrl')
        .sort({ createdAt: -1 })
        .lean();
      userSubmissionsTotal = userSubmissions.length;
      userSubmissionsTotalPages = 1;
    }

    // Get paginated submissions (always, not just when answer is published)
    let submissions: any[] = [];
    let totalSubmissions = 0;
    let totalPages = 0;

    const contestSubmissions = await UserContest.find({ contestId: req.params.id })
      .populate('userId', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    totalSubmissions = await UserContest.countDocuments({ contestId: req.params.id });
    totalPages = Math.ceil(totalSubmissions / limitNum);

    // Transform submissions to match frontend expectations
    submissions = contestSubmissions.map((sub: any) => ({
      ...sub,
      id: sub._id.toString(),
      user: sub.userId
    }));

    res.json({
      success: true,
      data: {
        contest: {
          ...contest,
          id: (contest as any)._id.toString()
        },
        userSubmission: userSubmission ? {
          ...userSubmission,
          id: (userSubmission as any)._id.toString()
        } : null,
        userSubmissions: userSubmissions.map((sub: any) => ({
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
  } catch (error) {
    console.error('Get contest details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Submit answer to contest
// @route   POST /api/contests/:id/submit
// @access  Private
export const submitContestAnswer = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const { answer } = req.body;
    const userId = (req as any).user.id;

    if (!answer || answer.trim() === '') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Answer is required' });
    }

    const contest = await Contest.findById(req.params.id).session(session);
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
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, points: { $gte: contest.pointsPerAnswer } },
      { $inc: { points: -contest.pointsPerAnswer } },
      { session, new: true }
    );
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
    const submission = new UserContest({
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
  } catch (error) {
    try { await session.abortTransaction(); } catch (e) {}
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    session.endSession();
  }
};

// @desc    Get user's contest history
// @route   GET /api/contests/history
// @access  Private
export const getContestHistory = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, contestId } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const userId = (req as any).user.id;

    // Get user's contest submissions, filter by contestId if provided
    const query: any = { userId };
    if (contestId) {
      query.contestId = contestId;
    }

    const submissions = await UserContest.find(query)
      .populate('contestId')
      .populate('userId', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    const totalSubmissions = await UserContest.countDocuments(query);
    const totalPages = Math.ceil(totalSubmissions / limitNum);

    // Transform submissions
    const transformedSubmissions = submissions.map(sub => ({
      ...sub,
      id: (sub as any)._id.toString(),
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
  } catch (error) {
    console.error('Get contest history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}; 