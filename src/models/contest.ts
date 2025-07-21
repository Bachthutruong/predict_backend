import mongoose, { Schema, models, model } from 'mongoose';

const ContestSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String, required: false },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  pointsPerAnswer: { type: Number, required: true }, // Số điểm cho mỗi lượt trả lời
  rewardPoints: { type: Number, required: true }, // Số điểm thưởng khi trả lời chính xác
  answer: { type: String, default: null }, // Đáp án sẽ được cập nhật sau
  isAnswerPublished: { type: Boolean, default: false }, // Trạng thái công bố đáp án
  status: { type: String, enum: ['active', 'finished', 'draft'], default: 'draft' },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Add indexes for better performance
ContestSchema.index({ status: 1, createdAt: -1 });
ContestSchema.index({ authorId: 1 });
ContestSchema.index({ startDate: 1, endDate: 1 });
ContestSchema.index({ isAnswerPublished: 1 });

// Add a toJSON transform to convert _id to id
ContestSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Contest = models.Contest || model('Contest', ContestSchema);

export default Contest; 