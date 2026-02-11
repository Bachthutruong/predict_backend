import mongoose, { Document } from 'mongoose';
export interface IRewardItem {
    type: 'points' | 'product';
    pointsAmount?: number;
    productId?: mongoose.Types.ObjectId;
    productQuantity?: number;
}
interface IPrediction extends Document {
    title: string;
    description: string;
    imageUrl?: string;
    'data-ai-hint'?: string;
    answer: string;
    pointsCost: number;
    rewardPoints: number;
    status: 'active' | 'finished';
    authorId: mongoose.Types.ObjectId;
    winnerId?: mongoose.Types.ObjectId;
    startDate?: Date | null;
    endDate?: Date | null;
    maxWinners: number;
    maxAttemptsPerUser: number;
    isAnswerPublished: boolean;
    rewards?: IRewardItem[];
    createdAt: Date;
    updatedAt: Date;
    getDecryptedAnswer(): string;
    isAuthor(userId: string): boolean;
}
declare const Prediction: mongoose.Model<any, {}, {}, {}, any, any>;
export default Prediction;
export type { IPrediction };
//# sourceMappingURL=prediction.d.ts.map