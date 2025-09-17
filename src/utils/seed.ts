import dbConnect from '../config/database';
import User from '../models/user';
import Prediction from '../models/prediction';
import UserPrediction from '../models/user-prediction';
import Contest from '../models/contest';
import UserContest from '../models/user-contest';
import Question from '../models/question';
import Feedback from '../models/feedback';
import Survey from '../models/survey';
import SurveySubmission from '../models/survey-submission';
import CheckIn from '../models/check-in';
import PointTransaction from '../models/point-transaction';
import Order from '../models/order';
import Referral from '../models/referral';
import SystemSettings from '../models/system-settings';
import { createVotingTestData } from './voting-seed';

// Create database indexes for better performance
export const createIndexes = async () => {
  try {
    console.log('🔧 Creating database indexes...');
    
    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ createdAt: -1 });
    
    // Prediction indexes
    await Prediction.collection.createIndex({ status: 1, createdAt: -1 });
    await Prediction.collection.createIndex({ authorId: 1 });
    await Prediction.collection.createIndex({ winnerId: 1 });
    await Prediction.collection.createIndex({ createdAt: -1 });
    
    // UserPrediction indexes
    await UserPrediction.collection.createIndex({ predictionId: 1, createdAt: -1 });
    await UserPrediction.collection.createIndex({ userId: 1 });
    await UserPrediction.collection.createIndex({ isCorrect: 1 });
    
    // Contest indexes
    await Contest.collection.createIndex({ status: 1, createdAt: -1 });
    await Contest.collection.createIndex({ authorId: 1 });
    await Contest.collection.createIndex({ startDate: 1, endDate: 1 });
    await Contest.collection.createIndex({ isAnswerPublished: 1 });
    
    // UserContest indexes
    await UserContest.collection.createIndex({ contestId: 1, createdAt: -1 });
    await UserContest.collection.createIndex({ userId: 1 });
    await UserContest.collection.createIndex({ isCorrect: 1 });
    
    // Question indexes
    await Question.collection.createIndex({ status: 1 });
    await Question.collection.createIndex({ createdAt: -1 });
    
    // Feedback indexes
    await Feedback.collection.createIndex({ status: 1 });
    await Feedback.collection.createIndex({ userId: 1 });
    await Feedback.collection.createIndex({ createdAt: -1 });
    
    // Survey indexes
    await Survey.collection.createIndex({ status: 1 });
    await Survey.collection.createIndex({ createdAt: -1 });
    
    // SurveySubmission indexes
    await SurveySubmission.collection.createIndex({ surveyId: 1 });
    await SurveySubmission.collection.createIndex({ userId: 1 });
    
    // CheckIn indexes - align with schema field names
    // Schema already defines a unique index with partialFilterExpression on { userId, checkInDate }
    // Here we only add a supporting index on checkInDate to help queries
    await CheckIn.collection.createIndex({ checkInDate: 1 });
    
    // PointTransaction indexes
    await PointTransaction.collection.createIndex({ userId: 1 });
    await PointTransaction.collection.createIndex({ type: 1 });
    await PointTransaction.collection.createIndex({ createdAt: -1 });
    
    // Order indexes
    await Order.collection.createIndex({ userId: 1 });
    await Order.collection.createIndex({ status: 1 });
    await Order.collection.createIndex({ createdAt: -1 });
    
    // Referral indexes
    await Referral.collection.createIndex({ referrerId: 1 });
    await Referral.collection.createIndex({ referredId: 1 });
    
    // Voting indexes
    await import('../models/voting-campaign').then(async ({ default: VotingCampaign }) => {
      await VotingCampaign.collection.createIndex({ status: 1, isActive: 1 });
      await VotingCampaign.collection.createIndex({ startDate: 1, endDate: 1 });
      await VotingCampaign.collection.createIndex({ createdBy: 1 });
    });
    
    await import('../models/vote-entry').then(async ({ default: VoteEntry }) => {
      await VoteEntry.collection.createIndex({ campaignId: 1 });
      await VoteEntry.collection.createIndex({ isActive: 1 });
    });
    
    await import('../models/user-vote').then(async ({ default: UserVote }) => {
      await UserVote.collection.createIndex({ userId: 1, campaignId: 1 });
      await UserVote.collection.createIndex({ entryId: 1 });
      await UserVote.collection.createIndex({ createdAt: 1 });
    });
    
    console.log('✅ Database indexes created successfully!');
    
    // Create voting test data if in development
    if (process.env.NODE_ENV === 'development') {
      await createVotingTestData();
    }
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
}; 