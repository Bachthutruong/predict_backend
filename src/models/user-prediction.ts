import mongoose, { Schema, models, model } from 'mongoose';

const UserPredictionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  predictionId: { type: Schema.Types.ObjectId, ref: 'Prediction', required: true },
  guess: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
  pointsSpent: { type: Number, required: true },
}, { timestamps: true });

// Allow multiple predictions from the same user
// UserPredictionSchema.index({ userId: 1, predictionId: 1 }, { unique: true });

UserPredictionSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const UserPrediction = models?.UserPrediction || model('UserPrediction', UserPredictionSchema);
export default UserPrediction; 