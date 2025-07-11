import { Request, Response } from 'express';
import VotingCampaign from '../models/voting-campaign';
import VoteEntry from '../models/vote-entry';
import UserVote from '../models/user-vote';
import User from '../models/user';
import PointTransaction from '../models/point-transaction';
import mongoose from 'mongoose';

// Get all active voting campaigns for public viewing
export const getActiveVotingCampaigns = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter for campaigns
    let filter: any = {
      isActive: true
    };

    // Filter by status if provided
    if (status && status !== 'all') {
      filter.status = status;
    } else {
      // If no status filter, exclude cancelled campaigns
      filter.status = { $ne: 'cancelled' };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const campaigns = await VotingCampaign.find(filter)
      .populate('createdBy', 'name')
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(limitNum);

    // Add entry count and dynamic status to each campaign
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const entryCount = await VoteEntry.countDocuments({ 
          campaignId: campaign._id,
          isActive: true,
          status: 'approved'
        });
        
        const totalVotes = await UserVote.countDocuments({ 
          campaignId: campaign._id 
        });

        // Tính trạng thái động dựa trên thời gian
        let dynamicStatus = campaign.status;
        const now = new Date();
        if (campaign.status !== 'cancelled') {
          if (now < campaign.startDate) {
            dynamicStatus = 'upcoming';
          } else if (now >= campaign.startDate && now <= campaign.endDate) {
            dynamicStatus = 'active';
          } else if (now > campaign.endDate) {
            dynamicStatus = 'closed';
          }
        }

        return {
          ...campaign.toJSON(),
          status: dynamicStatus, // Ghi đè status với trạng thái động
          entryCount,
          totalVotes,
          isVotingOpen: campaign.isVotingOpen(),
          isVotingCompleted: campaign.isVotingCompleted(),
          remainingTime: campaign.getRemainingTime()
        };
      })
    );

    // Filter campaigns by dynamic status if status parameter is provided
    let filteredCampaigns = campaignsWithStats;
    if (status && status !== 'all') {
      filteredCampaigns = campaignsWithStats.filter(campaign => campaign.status === status);
    }

    const total = filteredCampaigns.length;

    res.json({
      success: true,
      data: filteredCampaigns,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get active voting campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get voting campaigns'
    });
  }
};

// Get single voting campaign with entries (public view)
export const getVotingCampaignDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sortBy = 'random', page = 1, limit = 20 } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }

    const campaign = await VotingCampaign.findOne({
      _id: id,
      isActive: true
    }).populate('createdBy', 'name');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found or not active'
      });
    }

    // Tính trạng thái động
    let dynamicStatus = campaign.status;
    const now = new Date();
    if (campaign.status !== 'cancelled') {
      if (now < campaign.startDate) {
        dynamicStatus = 'upcoming';
      } else if (now >= campaign.startDate && now <= campaign.endDate) {
        dynamicStatus = 'active';
      } else if (now > campaign.endDate) {
        dynamicStatus = 'closed';
      }
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build sort criteria based on sortBy parameter
    let sortCriteria: any = {};
    switch (sortBy) {
      case 'votes':
        sortCriteria = { voteCount: -1 };
        break;
      case 'newest':
        sortCriteria = { createdAt: -1 };
        break;
      case 'oldest':
        sortCriteria = { createdAt: 1 };
        break;
      default: // random
        // MongoDB doesn't have a built-in random sort, so we'll use $sample for random
        break;
    }

    let entriesQuery;
    if (sortBy === 'random') {
      // Use aggregation for random sampling
      entriesQuery = VoteEntry.aggregate([
        { 
          $match: { 
            campaignId: new mongoose.Types.ObjectId(id),
            isActive: true,
            status: 'approved'
          } 
        },
        { $sample: { size: limitNum } },
        {
          $lookup: {
            from: 'users',
            localField: 'submittedBy',
            foreignField: '_id',
            as: 'submittedBy',
            pipeline: [{ $project: { name: 1 } }]
          }
        },
        {
          $addFields: {
            submittedBy: { $arrayElemAt: ['$submittedBy', 0] }
          }
        }
      ]);
    } else {
      entriesQuery = VoteEntry.find({ 
        campaignId: id,
        isActive: true,
        status: 'approved'
      })
        .populate('submittedBy', 'name')
        .sort(sortCriteria)
        .skip(skip)
        .limit(limitNum);
    }

    const entries = await entriesQuery;

    // Get vote data with masked usernames for each entry
    const entriesWithVotes = await Promise.all(
      entries.map(async (entry) => {
        const votes = await UserVote.find({ entryId: entry._id || entry.id })
          .populate('userId', 'name')
          .sort({ voteDate: -1 });

        // Mask usernames
        const maskedVotes = votes.map(vote => ({
          id: vote._id,
          voteDate: vote.voteDate,
          userName: maskUsername(vote.userId?.name || 'Anonymous')
        }));

        return {
          ...entry.toJSON ? entry.toJSON() : entry,
          votes: maskedVotes,
          voteCount: votes.length
        };
      })
    );

    // Get user's vote status if logged in
    let userVotes = [];
    if ((req as any).user) {
      const userId = (req as any).user.id;
      userVotes = await UserVote.find({ 
        userId, 
        campaignId: id 
      }).select('entryId');
    }

    const totalEntries = await VoteEntry.countDocuments({ 
      campaignId: id,
      isActive: true,
      status: 'approved'
    });

    res.json({
      success: true,
      data: {
        campaign: {
          ...campaign.toJSON(),
          status: dynamicStatus,
          isVotingOpen: campaign.isVotingOpen(),
          isVotingCompleted: campaign.isVotingCompleted(),
          remainingTime: campaign.getRemainingTime()
        },
        entries: entriesWithVotes,
        userVotes: userVotes.map(v => v.entryId.toString()),
        pagination: sortBy !== 'random' ? {
          page: pageNum,
          limit: limitNum,
          total: totalEntries,
          pages: Math.ceil(totalEntries / limitNum)
        } : null
      }
    });
  } catch (error) {
    console.error('Get voting campaign detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign details'
    });
  }
};

// Vote for an entry
export const voteForEntry = async (req: Request, res: Response) => {
  try {
    const { campaignId, entryId } = req.params;
    const userId = (req as any).user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(campaignId) || !mongoose.Types.ObjectId.isValid(entryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign or entry ID'
      });
    }

    // Get campaign and check if voting is open
    const campaign = await VotingCampaign.findById(campaignId);
    if (!campaign || !campaign.isVotingOpen()) {
      return res.status(400).json({
        success: false,
        message: 'Voting is not currently open for this campaign'
      });
    }

    // Check if entry exists and is active
    const entry = await VoteEntry.findOne({
      _id: entryId,
      campaignId,
      isActive: true,
      status: 'approved'
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found or not available for voting'
      });
    }

    // Check if user has already voted for this entry
    const existingVote = await UserVote.findOne({
      userId,
      campaignId,
      entryId
    });

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted for this entry'
      });
    }

    // Check voting limits based on campaign settings
    const userVotesCount = await UserVote.countDocuments({
      userId,
      campaignId
    });

    if (userVotesCount >= campaign.maxVotesPerUser) {
      return res.status(400).json({
        success: false,
        message: `You have reached the maximum votes limit (${campaign.maxVotesPerUser}) for this campaign`
      });
    }

    // Check daily voting limit if needed
    if (campaign.votingFrequency === 'daily') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayVotes = await UserVote.countDocuments({
        userId,
        campaignId,
        voteDate: {
          $gte: today,
          $lt: tomorrow
        }
      });

      if (todayVotes >= campaign.maxVotesPerUser) {
        return res.status(400).json({
          success: false,
          message: 'You have already voted today. Please try again tomorrow.'
        });
      }
    }

    // Create the vote using transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create vote record
      const vote = new UserVote({
        userId,
        campaignId,
        entryId,
        voteDate: new Date(),
        ipAddress,
        userAgent
      });

      await vote.save({ session });

      // Update entry vote count
      await VoteEntry.findByIdAndUpdate(
        entryId,
        { $inc: { voteCount: 1 } },
        { session }
      );

      // Award points to user
      if (campaign.pointsPerVote > 0) {
        console.log(`Awarding ${campaign.pointsPerVote} points to user ${userId} for voting`);
        
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { $inc: { points: campaign.pointsPerVote } },
          { session, new: true }
        );
        
        console.log(`User points after update: ${updatedUser?.points}`);

        // Create point transaction record
        const pointTransaction = new PointTransaction({
          userId,
          amount: campaign.pointsPerVote,
          reason: 'vote',
          notes: `Voted in campaign: ${campaign.title}`,
          relatedId: campaignId,
          relatedModel: 'VotingCampaign'
        });

        await pointTransaction.save({ session });
        console.log(`Point transaction created: ${pointTransaction._id}`);
      }

      await session.commitTransaction();

      res.json({
        success: true,
        message: 'Vote submitted successfully',
        data: {
          pointsEarned: campaign.pointsPerVote
        }
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Vote for entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit vote'
    });
  }
};

// Remove vote (if allowed)
export const removeVote = async (req: Request, res: Response) => {
  try {
    const { campaignId, entryId } = req.params;
    const userId = (req as any).user.id;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(campaignId) || !mongoose.Types.ObjectId.isValid(entryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign or entry ID'
      });
    }

    // Get campaign and check if voting is still open
    const campaign = await VotingCampaign.findById(campaignId);
    if (!campaign || !campaign.isVotingOpen()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove vote - voting period has ended'
      });
    }

    // Find the vote
    const vote = await UserVote.findOne({
      userId,
      campaignId,
      entryId
    });

    if (!vote) {
      return res.status(404).json({
        success: false,
        message: 'Vote not found'
      });
    }

    // Remove vote using transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Delete vote record
      await UserVote.findByIdAndDelete(vote._id, { session });

      // Update entry vote count
      await VoteEntry.findByIdAndUpdate(
        entryId,
        { $inc: { voteCount: -1 } },
        { session }
      );

      // Deduct points from user if any were awarded
      if (campaign.pointsPerVote > 0) {
        console.log(`Deducting ${campaign.pointsPerVote} points from user ${userId} for vote removal`);
        
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { $inc: { points: -campaign.pointsPerVote } },
          { session, new: true }
        );
        
        console.log(`User points after deduction: ${updatedUser?.points}`);

        // Create negative point transaction record
        const pointTransaction = new PointTransaction({
          userId,
          amount: -campaign.pointsPerVote,
          reason: 'vote-removal',
          notes: `Removed vote in campaign: ${campaign.title}`,
          relatedId: campaignId,
          relatedModel: 'VotingCampaign'
        });

        await pointTransaction.save({ session });
        console.log(`Point transaction created for removal: ${pointTransaction._id}`);
      }

      await session.commitTransaction();

      res.json({
        success: true,
        message: 'Vote removed successfully'
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Remove vote error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove vote'
    });
  }
};

// Get user's voting history
export const getUserVotingHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const votes = await UserVote.find({ userId })
      .populate({
        path: 'campaignId',
        select: 'title description startDate endDate status'
      })
      .populate({
        path: 'entryId',
        select: 'title description voteCount'
      })
      .sort({ voteDate: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await UserVote.countDocuments({ userId });

    res.json({
      success: true,
      data: votes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get user voting history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get voting history'
    });
  }
};

// Helper function to mask usernames
function maskUsername(username: string): string {
  if (!username || username.length <= 2) return username;
  
  const firstChar = username[0];
  const lastChar = username[username.length - 1];
  const maskedMiddle = '*'.repeat(Math.max(1, username.length - 2));
  
  return firstChar + maskedMiddle + lastChar;
} 