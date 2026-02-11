import mongoose, { Schema, models, model, Document } from 'mongoose';
import { decrypt, isEncrypted } from '../utils/encryption';

// Reward can be points or product
const RewardItemSchema = new Schema({
  type: { type: String, enum: ['points', 'product'], required: true },
  pointsAmount: { type: Number, default: 0 },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  productQuantity: { type: Number, default: 1 },
}, { _id: false });

const PredictionSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String, required: false },
  'data-ai-hint': { type: String },
  answer: { type: String, required: true },
  pointsCost: { type: Number, required: true },
  rewardPoints: { type: Number, required: true },
  status: { type: String, enum: ['active', 'finished'], default: 'active' },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  winnerId: { type: Schema.Types.ObjectId, ref: 'User' },
  winnerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Nhiều người trúng
  // New fields: Dự đoán trúng thưởng (merged with contest)
  startDate: { type: Date, default: null }, // null = no limit, always ongoing
  endDate: { type: Date, default: null }, // null = no limit
  maxWinners: { type: Number, default: 1 }, // Số lượng người trúng thưởng tối đa
  maxAttemptsPerUser: { type: Number, default: 999 }, // Số lần dự đoán mỗi người (999 = unlimited)
  isAnswerPublished: { type: Boolean, default: false }, // Đáp án đã công bố chưa (user mới biết đúng/sai)
  rewards: [RewardItemSchema], // Phần thưởng: xu + sản phẩm (mặc định dùng rewardPoints nếu empty)
}, { timestamps: true });

// Add indexes for better performance
PredictionSchema.index({ status: 1, createdAt: -1 }); // For active predictions query
PredictionSchema.index({ authorId: 1 }); // For author lookups
PredictionSchema.index({ winnerId: 1 }); // For winner lookups
PredictionSchema.index({ createdAt: -1 }); // For sorting by creation date

// Auto-calculate rewardPoints if not provided
PredictionSchema.pre('validate', function(next) {
  const doc: any = this as any;
  if (typeof doc.rewardPoints !== 'number' || doc.rewardPoints <= 0) {
    const base: number = typeof doc.pointsCost === 'number' ? doc.pointsCost : 0;
    doc.rewardPoints = Math.round(base * 1.5);
  }
  next();
});

// Add a toJSON transform to convert _id to id
PredictionSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

// Interface for reward item
export interface IRewardItem {
  type: 'points' | 'product';
  pointsAmount?: number;
  productId?: mongoose.Types.ObjectId;
  productQuantity?: number;
}

// Interface for the prediction document
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

PredictionSchema.methods.getDecryptedAnswer = function(): string {
  try {
    if (isEncrypted(this.answer)) return decrypt(this.answer);
    return this.answer;
  } catch {
    return '';
  }
};

PredictionSchema.methods.isAuthor = function(userId: string): boolean {
  return this.authorId.toString() === userId;
};

const Prediction = models.Prediction || model<IPrediction>('Prediction', PredictionSchema);

export default Prediction;
export type { IPrediction }; 