"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIndexes = void 0;
const user_1 = __importDefault(require("../models/user"));
const prediction_1 = __importDefault(require("../models/prediction"));
const user_prediction_1 = __importDefault(require("../models/user-prediction"));
const contest_1 = __importDefault(require("../models/contest"));
const user_contest_1 = __importDefault(require("../models/user-contest"));
const question_1 = __importDefault(require("../models/question"));
const feedback_1 = __importDefault(require("../models/feedback"));
const survey_1 = __importDefault(require("../models/survey"));
const survey_submission_1 = __importDefault(require("../models/survey-submission"));
const check_in_1 = __importDefault(require("../models/check-in"));
const point_transaction_1 = __importDefault(require("../models/point-transaction"));
const order_1 = __importDefault(require("../models/order"));
const referral_1 = __importDefault(require("../models/referral"));
const voting_seed_1 = require("./voting-seed");
// Create database indexes for better performance
const createIndexes = async () => {
    try {
        console.log('🔧 Creating database indexes...');
        // User indexes
        await user_1.default.collection.createIndex({ email: 1 }, { unique: true });
        await user_1.default.collection.createIndex({ role: 1 });
        await user_1.default.collection.createIndex({ createdAt: -1 });
        // Prediction indexes
        await prediction_1.default.collection.createIndex({ status: 1, createdAt: -1 });
        await prediction_1.default.collection.createIndex({ authorId: 1 });
        await prediction_1.default.collection.createIndex({ winnerId: 1 });
        await prediction_1.default.collection.createIndex({ createdAt: -1 });
        // UserPrediction indexes
        await user_prediction_1.default.collection.createIndex({ predictionId: 1, createdAt: -1 });
        await user_prediction_1.default.collection.createIndex({ userId: 1 });
        await user_prediction_1.default.collection.createIndex({ isCorrect: 1 });
        // Contest indexes
        await contest_1.default.collection.createIndex({ status: 1, createdAt: -1 });
        await contest_1.default.collection.createIndex({ authorId: 1 });
        await contest_1.default.collection.createIndex({ startDate: 1, endDate: 1 });
        await contest_1.default.collection.createIndex({ isAnswerPublished: 1 });
        // UserContest indexes
        await user_contest_1.default.collection.createIndex({ contestId: 1, createdAt: -1 });
        await user_contest_1.default.collection.createIndex({ userId: 1 });
        await user_contest_1.default.collection.createIndex({ isCorrect: 1 });
        // Question indexes
        await question_1.default.collection.createIndex({ status: 1 });
        await question_1.default.collection.createIndex({ createdAt: -1 });
        // Feedback indexes
        await feedback_1.default.collection.createIndex({ status: 1 });
        await feedback_1.default.collection.createIndex({ userId: 1 });
        await feedback_1.default.collection.createIndex({ createdAt: -1 });
        // Survey indexes
        await survey_1.default.collection.createIndex({ status: 1 });
        await survey_1.default.collection.createIndex({ createdAt: -1 });
        // SurveySubmission indexes
        await survey_submission_1.default.collection.createIndex({ surveyId: 1 });
        await survey_submission_1.default.collection.createIndex({ userId: 1 });
        // CheckIn indexes - align with schema field names
        // Schema already defines a unique index with partialFilterExpression on { userId, checkInDate }
        // Here we only add a supporting index on checkInDate to help queries
        await check_in_1.default.collection.createIndex({ checkInDate: 1 });
        // PointTransaction indexes
        await point_transaction_1.default.collection.createIndex({ userId: 1 });
        await point_transaction_1.default.collection.createIndex({ type: 1 });
        await point_transaction_1.default.collection.createIndex({ createdAt: -1 });
        // Order indexes
        await order_1.default.collection.createIndex({ userId: 1 });
        await order_1.default.collection.createIndex({ status: 1 });
        await order_1.default.collection.createIndex({ createdAt: -1 });
        // Referral indexes
        await referral_1.default.collection.createIndex({ referrerId: 1 });
        await referral_1.default.collection.createIndex({ referredId: 1 });
        // Voting indexes
        await Promise.resolve().then(() => __importStar(require('../models/voting-campaign'))).then(async ({ default: VotingCampaign }) => {
            await VotingCampaign.collection.createIndex({ status: 1, isActive: 1 });
            await VotingCampaign.collection.createIndex({ startDate: 1, endDate: 1 });
            await VotingCampaign.collection.createIndex({ createdBy: 1 });
        });
        await Promise.resolve().then(() => __importStar(require('../models/vote-entry'))).then(async ({ default: VoteEntry }) => {
            await VoteEntry.collection.createIndex({ campaignId: 1 });
            await VoteEntry.collection.createIndex({ isActive: 1 });
        });
        await Promise.resolve().then(() => __importStar(require('../models/user-vote'))).then(async ({ default: UserVote }) => {
            await UserVote.collection.createIndex({ userId: 1, campaignId: 1 });
            await UserVote.collection.createIndex({ entryId: 1 });
            await UserVote.collection.createIndex({ createdAt: 1 });
        });
        console.log('✅ Database indexes created successfully!');
        // Create voting test data if in development
        if (process.env.NODE_ENV === 'development') {
            await (0, voting_seed_1.createVotingTestData)();
        }
    }
    catch (error) {
        console.error('❌ Error creating indexes:', error);
    }
};
exports.createIndexes = createIndexes;
//# sourceMappingURL=seed.js.map