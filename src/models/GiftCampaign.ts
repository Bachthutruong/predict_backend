import { Schema, model, models } from 'mongoose';

const GiftCampaignSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    requiredQuantity: { type: Number, required: true, min: 1 },
    triggerProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    giftProducts: [{ type: Schema.Types.ObjectId, ref: 'Product', required: true }],
    allowMultiSelect: { type: Boolean, default: false },
    maxSelectableGifts: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

GiftCampaignSchema.index({ isActive: 1, requiredQuantity: 1 });
GiftCampaignSchema.index({ triggerProducts: 1, isActive: 1 });

GiftCampaignSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const GiftCampaign = models?.GiftCampaign || model('GiftCampaign', GiftCampaignSchema);

export default GiftCampaign;
