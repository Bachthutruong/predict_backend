"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const InventoryLogSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    changeAmount: { type: Number, required: true }, // positive for add, negative for sub
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    type: { type: String, enum: ['import', 'export', 'sale', 'return', 'adjustment', 'initial'], required: true, index: true },
    reason: { type: String, default: '' },
    note: { type: String, default: '' },
    performedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    orderRef: { type: mongoose_1.Schema.Types.ObjectId, ref: 'SystemOrder' }
}, { timestamps: true });
InventoryLogSchema.index({ createdAt: -1 });
InventoryLogSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const InventoryLog = mongoose_1.models?.InventoryLog || (0, mongoose_1.model)('InventoryLog', InventoryLogSchema);
exports.default = InventoryLog;
//# sourceMappingURL=InventoryLog.js.map