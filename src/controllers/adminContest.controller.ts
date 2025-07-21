import { Request, Response } from 'express';
import Contest from '../models/contest';
import UserContest from '../models/user-contest';
import User from '../models/user';
import PointTransaction from '../models/point-transaction';
import mongoose from 'mongoose';

// @desc    Create a new contest
// @route   POST /api/admin/contests
// @access  Private/Admin
export const createContest = async (req: Request, res: Response) => {
  const { 
    title, 
    description, 
    startDate, 
    endDate, 
    pointsPerAnswer, 
    rewardPoints, 
    imageUrl, 
    status 
  }: {
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    pointsPerAnswer: number;
    rewardPoints: number;
    imageUrl?: string;
    status: 'active' | 'finished' | 'draft';
  } = req.body;
  
  // Basic validation
  if (!title || !description || !startDate || !endDate || !pointsPerAnswer || !rewardPoints) {
    return res.status(400).json({ message: 'Missing required fields: title, description, startDate, endDate, pointsPerAnswer, rewardPoints.' });
  }

  // Validate dates
  if (new Date(startDate) >= new Date(endDate)) {
    return res.status(400).json({ message: 'End date must be after start date.' });
  }

  // Validate points
  if (pointsPerAnswer < 0 || rewardPoints < 0) {
    return res.status(400).json({ message: 'Points must be non-negative.' });
  }

  try {
    const contest = new Contest({
      title,
      description,
      startDate,
      endDate,
      pointsPerAnswer,
      rewardPoints,
      imageUrl,
      status,
      authorId: (req as any).user.id,
    });

    const createdContest = await contest.save();
    res.status(201).json({ message: 'Contest created successfully', data: createdContest });
  } catch (error) {
    console.error('Error creating contest:', error);
    if (error instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    res.status(500).json({ message: 'Server error while creating contest.' });
  }
};

// @desc    Get all contests
// @route   GET /api/admin/contests
// @access  Private/Admin
export const getContests = async (req: Request, res: Response) => {
    try {
        const contests = await Contest.find()
          .populate('authorId', 'name')
          .sort({ createdAt: -1 });
        res.json({ message: 'Contests fetched successfully', data: contests });
    } catch (error) {
        console.error('Error fetching contests:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get a single contest by ID
// @route   GET /api/admin/contests/:id
// @access  Private/Admin
export const getContestById = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const contest = await Contest.findById(req.params.id)
          .populate('authorId', 'name avatarUrl');
        
        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }

        // Get paginated submissions for this contest
        const submissions = await UserContest.find({ contestId: req.params.id })
          .populate('userId', 'name avatarUrl')
          .sort({ createdAt: -1 })
          .limit(limitNum)
          .skip((pageNum - 1) * limitNum)
          .lean();
        const totalSubmissions = await UserContest.countDocuments({ contestId: req.params.id });
        const totalPages = Math.ceil(totalSubmissions / limitNum);
        const transformedSubmissions = submissions.map(sub => ({
          ...sub,
          id: (sub as any)._id.toString(),
          user: sub.userId
        }));

        res.json({ 
          message: 'Contest fetched successfully', 
          data: {
            contest,
            submissions: transformedSubmissions,
            totalSubmissions,
            totalPages
          }
        });
    } catch (error) {
        console.error('Error fetching contest by ID:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update a contest
// @route   PUT /api/admin/contests/:id
// @access  Private/Admin
export const updateContest = async (req: Request, res: Response) => {
    const { 
      title, 
      description, 
      startDate, 
      endDate, 
      pointsPerAnswer, 
      rewardPoints, 
      imageUrl, 
      status 
    } = req.body;

    try {
        const contest = await Contest.findById(req.params.id);
        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }

        // Validate dates if provided
        if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
            return res.status(400).json({ message: 'End date must be after start date.' });
        }

        // Validate points if provided
        if ((pointsPerAnswer !== undefined && pointsPerAnswer < 0) || 
            (rewardPoints !== undefined && rewardPoints < 0)) {
            return res.status(400).json({ message: 'Points must be non-negative.' });
        }

        const updatedContest = await Contest.findByIdAndUpdate(
            req.params.id,
            { title, description, startDate, endDate, pointsPerAnswer, rewardPoints, imageUrl, status },
            { new: true, runValidators: true }
        ).populate('authorId', 'name avatarUrl');

        res.json({ message: 'Contest updated successfully', data: updatedContest });
    } catch (error) {
        console.error('Error updating contest:', error);
        if (error instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a contest
// @route   DELETE /api/admin/contests/:id
// @access  Private/Admin
export const deleteContest = async (req: Request, res: Response) => {
    try {
        const contest = await Contest.findById(req.params.id);
        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }

        // Check if there are any submissions
        const submissionCount = await UserContest.countDocuments({ contestId: req.params.id });
        if (submissionCount > 0) {
            return res.status(400).json({ message: 'Cannot delete contest with existing submissions' });
        }

        await Contest.findByIdAndDelete(req.params.id);
        res.json({ message: 'Contest deleted successfully' });
    } catch (error) {
        console.error('Error deleting contest:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Publish answer for a contest
// @route   PUT /api/admin/contests/:id/publish-answer
// @access  Private/Admin
export const publishAnswer = async (req: Request, res: Response) => {
    const { answer } = req.body;

    if (!answer) {
        return res.status(400).json({ message: 'Answer is required' });
    }

    try {
        const contest = await Contest.findById(req.params.id);
        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }

        // Update contest with answer and mark as published
        contest.answer = answer;
        contest.isAnswerPublished = true;
        contest.status = 'finished';
        await contest.save();

        // Process all submissions and award points to correct answers
        const submissions = await UserContest.find({ contestId: req.params.id })
          .populate('userId', 'name');

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            for (const submission of submissions) {
                const isCorrect = submission.answer.toLowerCase().trim() === answer.toLowerCase().trim();
                submission.isCorrect = isCorrect;
                
                if (isCorrect) {
                    submission.rewardPointsEarned = contest.rewardPoints;
                    
                    // Award points to user
                    await User.findByIdAndUpdate(
                        submission.userId,
                        { $inc: { points: contest.rewardPoints } },
                        { session }
                    );

                    // Create point transaction record
                    await PointTransaction.create([{
                        userId: submission.userId,
                        adminId: (req as any).user.id,
                        amount: contest.rewardPoints,
                        reason: 'contest-win',
                        notes: `Won contest: ${contest.title}`
                    }], { session });
                }

                await submission.save({ session });
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        res.json({ 
            message: 'Answer published successfully', 
            data: {
                contest,
                correctSubmissions: submissions.filter(s => s.isCorrect).length,
                totalSubmissions: submissions.length
            }
        });
    } catch (error) {
        console.error('Error publishing answer:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get contest submissions
// @route   GET /api/admin/contests/:id/submissions
// @access  Private/Admin
export const getContestSubmissions = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20, filter } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        
        const contest = await Contest.findById(req.params.id);
        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }

        let query: any = { contestId: req.params.id };
        
        // Apply filter if provided
        if (filter === 'correct') {
            query.isCorrect = true;
        } else if (filter === 'incorrect') {
            query.isCorrect = false;
        }

        const submissions = await UserContest.find(query)
          .populate('userId', 'name avatarUrl')
          .sort({ createdAt: -1 })
          .limit(limitNum)
          .skip((pageNum - 1) * limitNum);

        const totalSubmissions = await UserContest.countDocuments(query);
        const totalPages = Math.ceil(totalSubmissions / limitNum);

        // Get statistics
        const correctSubmissions = await UserContest.countDocuments({ 
            contestId: req.params.id, 
            isCorrect: true 
        });

        res.json({
            message: 'Submissions fetched successfully',
            data: {
                submissions,
                totalSubmissions,
                totalPages,
                currentPage: pageNum,
                statistics: {
                    total: totalSubmissions,
                    correct: correctSubmissions,
                    incorrect: totalSubmissions - correctSubmissions
                }
            }
        });
    } catch (error) {
        console.error('Error fetching contest submissions:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get contest statistics
// @route   GET /api/admin/contests/:id/statistics
// @access  Private/Admin
export const getContestStatistics = async (req: Request, res: Response) => {
    try {
        const contest = await Contest.findById(req.params.id);
        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }

        const totalSubmissions = await UserContest.countDocuments({ contestId: req.params.id });
        const correctSubmissions = await UserContest.countDocuments({ 
            contestId: req.params.id, 
            isCorrect: true 
        });

        // Get unique participants
        const uniqueParticipants = await UserContest.distinct('userId', { contestId: req.params.id });
        const participantCount = uniqueParticipants.length;

        // Calculate total points spent and awarded
        const submissions = await UserContest.find({ contestId: req.params.id });
        const totalPointsSpent = submissions.reduce((sum, sub) => sum + sub.pointsSpent, 0);
        const totalRewardPointsAwarded = submissions.reduce((sum, sub) => sum + sub.rewardPointsEarned, 0);

        res.json({
            message: 'Statistics fetched successfully',
            data: {
                contest,
                statistics: {
                    totalSubmissions,
                    correctSubmissions,
                    incorrectSubmissions: totalSubmissions - correctSubmissions,
                    participantCount,
                    totalPointsSpent,
                    totalRewardPointsAwarded,
                    accuracyRate: totalSubmissions > 0 ? (correctSubmissions / totalSubmissions * 100).toFixed(2) : 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching contest statistics:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 