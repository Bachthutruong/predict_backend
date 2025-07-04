import mongoose, { Schema, models, model } from 'mongoose';

const PredictionSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String, required: false },
  'data-ai-hint': { type: String },
  answer: { type: String, required: true },
  pointsCost: { type: Number, required: true },
  status: { type: String, enum: ['active', 'finished'], default: 'active' },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  winnerId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Add a toJSON transform to convert _id to id
PredictionSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Prediction = models?.Prediction || model('Prediction', PredictionSchema);
export default Prediction; 