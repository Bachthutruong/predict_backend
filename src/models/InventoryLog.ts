import mongoose, { Schema, models, model } from 'mongoose';

const InventoryLogSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    changeAmount: { type: Number, required: true }, // positive for add, negative for sub
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    type: { type: String, enum: ['import', 'export', 'sale', 'return', 'adjustment', 'initial'], required: true, index: true },
    reason: { type: String, default: '' },
    note: { type: String, default: '' },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    orderRef: { type: Schema.Types.ObjectId, ref: 'SystemOrder' }
}, { timestamps: true });

InventoryLogSchema.index({ createdAt: -1 });

InventoryLogSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});

const InventoryLog = models?.InventoryLog || model('InventoryLog', InventoryLogSchema);
export default InventoryLog;
