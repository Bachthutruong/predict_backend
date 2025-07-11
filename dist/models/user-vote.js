"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const UserVoteSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    campaignId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'VotingCampaign',
        required: true,
        index: true
    },
    entryId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const UserVote = mongoose_1.models?.UserVote || (0, mongoose_1.model)('UserVote', UserVoteSchema);
exports.default = UserVote;
//# sourceMappingURL=user-vote.js.map