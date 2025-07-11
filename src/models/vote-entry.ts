import mongoose, { Schema, models, model, Document } from 'mongoose';

interface IVoteEntry extends Document {
  campaignId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  imageUrl?: string;
  submittedBy: mongoose.Types.ObjectId; // user who submitted this entry
  voteCount: number;
  status: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  
  // Helper methods
  incrementVoteCount(): void;
  decrementVoteCount(): void;
}

const VoteEntrySchema = new Schema({
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'VotingCampaign',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  imageUrl: {
    type: String,
    default: ''
  },
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  voteCount: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved', // Auto approve for now, can be changed later
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
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

// Compound indexes for better query performance
VoteEntrySchema.index({ campaignId: 1, status: 1, isActive: 1 });
VoteEntrySchema.index({ campaignId: 1, voteCount: -1 }); // For ranking by votes
VoteEntrySchema.index({ submittedBy: 1, createdAt: -1 });

// Helper methods
VoteEntrySchema.methods.incrementVoteCount = function(): void {
  this.voteCount += 1;
};

VoteEntrySchema.methods.decrementVoteCount = function(): void {
  this.voteCount = Math.max(0, this.voteCount - 1);
};

const VoteEntry = models?.VoteEntry || model<IVoteEntry>('VoteEntry', VoteEntrySchema);
export default VoteEntry; 