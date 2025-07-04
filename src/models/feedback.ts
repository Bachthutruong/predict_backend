import mongoose, { Schema, models, model } from 'mongoose';

const FeedbackSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  feedbackText: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  awardedPoints: { type: Number },
}, { timestamps: true });

FeedbackSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Feedback = models?.Feedback || model('Feedback', FeedbackSchema);
export default Feedback; 