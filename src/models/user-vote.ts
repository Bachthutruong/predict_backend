import mongoose, { Schema, models, model, Document } from 'mongoose';

interface IUserVote extends Document {
  userId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  entryId: mongoose.Types.ObjectId;
  voteDate: Date;
  ipAddress?: string; // For additional tracking
  userAgent?: string; // For additional tracking
}

const UserVoteSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'VotingCampaign',
    required: true,
    index: true
  },
  entryId: {
    type: Schema.Types.ObjectId,
    ref: 'VoteEntry',
    required: true,
    index: true
  },
  voteDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  }
}, { 
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
    }
  }
});

// Compound indexes for better query performance and uniqueness
UserVoteSchema.index({ userId: 1, campaignId: 1, entryId: 1 }, { unique: true }); // Prevent duplicate votes
UserVoteSchema.index({ campaignId: 1, voteDate: -1 }); // For campaign vote tracking
UserVoteSchema.index({ entryId: 1, voteDate: -1 }); // For entry vote tracking
UserVoteSchema.index({ userId: 1, voteDate: -1 }); // For user vote history

// For daily voting frequency check
UserVoteSchema.index({ 
  userId: 1, 
  campaignId: 1, 
  voteDate: 1 
}); // For checking daily voting limits

const UserVote = models?.UserVote || model<IUserVote>('UserVote', UserVoteSchema);
export default UserVote; 