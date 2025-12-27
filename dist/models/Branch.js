"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const BranchSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    coordinates: {
        lat: { type: Number },
        lng: { type: Number }
    }
}, { timestamps: true });
BranchSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const Branch = mongoose_1.models?.Branch || (0, mongoose_1.model)('Branch', BranchSchema);
exports.default = Branch;
//# sourceMappingURL=Branch.js.map