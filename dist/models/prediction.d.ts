import mongoose, { Document } from 'mongoose';
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
    createdAt: Date;
    updatedAt: Date;
    getDecryptedAnswer(): string;
    isAuthor(userId: string): boolean;
}
declare const Prediction: mongoose.Model<any, {}, {}, {}, any, any>;
export default Prediction;
export type { IPrediction };
//# sourceMappingURL=prediction.d.ts.map