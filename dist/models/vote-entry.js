"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const VoteEntrySchema = new mongoose_1.Schema({
    campaignId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
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
VoteEntrySchema.methods.incrementVoteCount = function () {
    this.voteCount += 1;
};
VoteEntrySchema.methods.decrementVoteCount = function () {
    this.voteCount = Math.max(0, this.voteCount - 1);
};
const VoteEntry = mongoose_1.models?.VoteEntry || (0, mongoose_1.model)('VoteEntry', VoteEntrySchema);
exports.default = VoteEntry;
//# sourceMappingURL=vote-entry.js.map