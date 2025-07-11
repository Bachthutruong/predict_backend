"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const VotingCampaignSchema = new mongoose_1.Schema({
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
        trim: true
    },
    imageUrl: {
        type: String,
        default: ''
    },
    startDate: {
        type: Date,
        required: true,
        index: true
    },
    endDate: {
        type: Date,
        required: true,
        index: true
    },
    pointsPerVote: {
        type: Number,
        required: true,
        default: 10,
        min: 0,
        max: 1000
    },
    maxVotesPerUser: {
        type: Number,
        required: true,
        default: 1,
        min: 1,
        max: 100
    },
    votingFrequency: {
        type: String,
        enum: ['once', 'daily'],
        required: true,
        default: 'once'
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'completed', 'cancelled'],
        required: true,
        default: 'draft',
        index: true
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
        index: true
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
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
VotingCampaignSchema.index({ status: 1, isActive: 1, startDate: 1, endDate: 1 });
VotingCampaignSchema.index({ createdBy: 1, createdAt: -1 });
// Helper methods
VotingCampaignSchema.methods.isVotingOpen = function () {
    const now = new Date();
    // Sử dụng logic động: kiểm tra thời gian thay vì chỉ dựa vào status
    return this.isActive &&
        this.status !== 'cancelled' &&
        now >= this.startDate &&
        now <= this.endDate;
};
VotingCampaignSchema.methods.isVotingCompleted = function () {
    const now = new Date();
    return this.status === 'completed' || (now > this.endDate);
};
VotingCampaignSchema.methods.getRemainingTime = function () {
    const now = new Date();
    if (now > this.endDate)
        return 0;
    return this.endDate.getTime() - now.getTime();
};
const VotingCampaign = mongoose_1.models?.VotingCampaign || (0, mongoose_1.model)('VotingCampaign', VotingCampaignSchema);
exports.default = VotingCampaign;
//# sourceMappingURL=voting-campaign.js.map