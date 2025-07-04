import mongoose, { Schema, models, model } from 'mongoose';

const CheckInSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  answer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  pointsEarned: { type: Number, required: true },
  checkInDate: { type: Date, default: Date.now },
}, { timestamps: true });

// Ensure only one check-in per user per day
CheckInSchema.index(
  { userId: 1, checkInDate: 1 }, 
  { 
    unique: true,
    partialFilterExpression: {
      checkInDate: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    }
  }
);

CheckInSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const CheckIn = models?.CheckIn || model('CheckIn', CheckInSchema);
export default CheckIn; 