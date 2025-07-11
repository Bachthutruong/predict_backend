import { Request, Response } from 'express';
import VotingCampaign from '../models/voting-campaign';
import VoteEntry from '../models/vote-entry';
import UserVote from '../models/user-vote';
import User from '../models/user';
import mongoose from 'mongoose';

// Get all voting campaigns for admin
export const getVotingCampaigns = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    let filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const campaigns = await VotingCampaign.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Add entry count and total votes for each campaign
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const entryCount = await VoteEntry.countDocuments({ 
          campaignId: campaign._id,
          isActive: true 
        });
        const totalVotes = await UserVote.countDocuments({ 
          campaignId: campaign._id 
        });

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
        return {
          ...campaign.toObject(),
          entryCount,
          totalVotes,
          status: dynamicStatus // Ghi đè status trả về
        };
      })
    );

    const total = await VotingCampaign.countDocuments(filter);

    res.json({
      success: true,
      data: {
        data: campaignsWithStats,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get voting campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get voting campaigns'
    });
  }
};

// Get single voting campaign with entries
export const getVotingCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }

    const campaign = await VotingCampaign.findById(id)
      .populate('createdBy', 'name email');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
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

    // Get entries for this campaign
    const entries = await VoteEntry.find({ 
      campaignId: id,
      isActive: true 
    })
      .populate('submittedBy', 'name email')
      .sort({ voteCount: -1 });

    // Get vote statistics
    const totalVotes = await UserVote.countDocuments({ campaignId: id });
    const uniqueVoters = await UserVote.distinct('userId', { campaignId: id });

    res.json({
      success: true,
      data: {
        campaign: {
          ...campaign.toObject(),
          status: dynamicStatus
        },
        entries,
        statistics: {
          totalEntries: entries.length,
          totalVotes,
          uniqueVoters: uniqueVoters.length
        }
      }
    });
  } catch (error) {
    console.error('Get voting campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get voting campaign'
    });
  }
};

// Create new voting campaign
export const createVotingCampaign = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      imageUrl,
      startDate,
      endDate,
      pointsPerVote,
      maxVotesPerUser,
      votingFrequency,
      status // Add status to the destructuring
    } = req.body;

    const userId = (req as any).user.id;

    // Validation
    if (!title || !description || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Compare dates using timestamps to avoid timezone issues
    if (end.getTime() <= start.getTime()) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    if (start < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be in the future'
      });
    }

    const campaign = new VotingCampaign({
      title,
      description,
      imageUrl: imageUrl || '',
      startDate: start,
      endDate: end,
      pointsPerVote: pointsPerVote || 10,
      maxVotesPerUser: maxVotesPerUser || 1,
      votingFrequency: votingFrequency || 'once',
      status: status || 'draft', // Bổ sung dòng này
      createdBy: userId
    });

    await campaign.save();

    res.status(201).json({
      success: true,
      message: 'Voting campaign created successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Create voting campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create voting campaign'
    });
  }
};

// Update voting campaign
export const updateVotingCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }

    const campaign = await VotingCampaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Don't allow updates if campaign is active and has votes
    if (campaign.status === 'active') {
      const hasVotes = await UserVote.countDocuments({ campaignId: id });
      if (hasVotes > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update active campaign that has votes'
        });
      }
    }

    // Validate dates if being updated
    if (updates.startDate || updates.endDate) {
      const startDate = new Date(updates.startDate || campaign.startDate);
      const endDate = new Date(updates.endDate || campaign.endDate);

      // Ensure dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }



      // Compare dates using timestamps to avoid timezone issues
      if (endDate.getTime() <= startDate.getTime()) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    const updatedCampaign = await VotingCampaign.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: false }
    ).populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: updatedCampaign
    });
  } catch (error: any) {
    console.error('Update voting campaign error:', error);
    
    // Handle validation errors specifically
    if (error instanceof mongoose.Error.ValidationError || error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: validationErrors.join(', ')
      });
    }
    
    // Handle other specific error types
    if (error.message && error.message.includes('End date must be after start date')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update voting campaign'
    });
  }
};

// Delete voting campaign
export const deleteVotingCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }

    const campaign = await VotingCampaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Don't allow deletion if campaign has votes
    const hasVotes = await UserVote.countDocuments({ campaignId: id });
    if (hasVotes > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete campaign that has votes'
      });
    }

    // Delete all entries for this campaign
    await VoteEntry.deleteMany({ campaignId: id });
    
    // Delete the campaign
    await VotingCampaign.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Delete voting campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete voting campaign'
    });
  }
};

// Add entry to campaign
export const addVoteEntry = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { title, description, imageUrl } = req.body;
    const userId = (req as any).user.id;

    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    const campaign = await VotingCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const entry = new VoteEntry({
      campaignId,
      title,
      description,
      imageUrl: imageUrl || '',
      submittedBy: userId
    });

    await entry.save();

    res.status(201).json({
      success: true,
      message: 'Entry added successfully',
      data: entry
    });
  } catch (error) {
    console.error('Add vote entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add entry'
    });
  }
};

// Update vote entry
export const updateVoteEntry = async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(entryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entry ID'
      });
    }

    const entry = await VoteEntry.findByIdAndUpdate(
      entryId,
      updates,
      { new: true, runValidators: true }
    ).populate('submittedBy', 'name email');

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Entry updated successfully',
      data: entry
    });
  } catch (error) {
    console.error('Update vote entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update entry'
    });
  }
};

// Delete vote entry
export const deleteVoteEntry = async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(entryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entry ID'
      });
    }

    const entry = await VoteEntry.findById(entryId);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    // Delete all votes for this entry
    await UserVote.deleteMany({ entryId });
    
    // Delete the entry
    await VoteEntry.findByIdAndDelete(entryId);

    res.json({
      success: true,
      message: 'Entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete vote entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete entry'
    });
  }
};

// Get voting statistics
export const getVotingStatistics = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }

    // Get campaign details
    const campaign = await VotingCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Get vote statistics
    const totalVotes = await UserVote.countDocuments({ campaignId });
    const uniqueVoters = await UserVote.distinct('userId', { campaignId });
    
    // Get top entries
    const topEntries = await VoteEntry.find({ 
      campaignId,
      isActive: true 
    })
      .populate('submittedBy', 'name email')
      .sort({ voteCount: -1 })
      .limit(10);

    // Get voting activity by day
    const votingActivity = await UserVote.aggregate([
      { $match: { campaignId: new mongoose.Types.ObjectId(campaignId) } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$voteDate"
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        campaign: {
          title: campaign.title,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate
        },
        summary: {
          totalVotes,
          uniqueVoters: uniqueVoters.length,
          totalEntries: topEntries.length
        },
        topEntries,
        votingActivity
      }
    });
  } catch (error) {
    console.error('Get voting statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get voting statistics'
    });
  }
}; 