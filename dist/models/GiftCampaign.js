"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const GiftCampaignSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    requiredQuantity: { type: Number, required: true, min: 1 },
    triggerProducts: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' }],
    giftProducts: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true }],
    allowMultiSelect: { type: Boolean, default: false },
    maxSelectableGifts: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
GiftCampaignSchema.index({ isActive: 1, requiredQuantity: 1 });
GiftCampaignSchema.index({ triggerProducts: 1, isActive: 1 });
GiftCampaignSchema.set('toJSON', {
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const GiftCampaign = mongoose_1.models?.GiftCampaign || (0, mongoose_1.model)('GiftCampaign', GiftCampaignSchema);
exports.default = GiftCampaign;
//# sourceMappingURL=GiftCampaign.js.map