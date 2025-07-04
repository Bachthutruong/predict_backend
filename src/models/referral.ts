import mongoose, { Schema, models, model } from 'mongoose';

const ReferralSchema = new Schema({
  referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  referredUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
}, { timestamps: true });

ReferralSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Referral = models?.Referral || model('Referral', ReferralSchema);
export default Referral; 