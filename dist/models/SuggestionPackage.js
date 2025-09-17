"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const SuggestionPackageSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    suggestionCount: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    // Display order
    sortOrder: { type: Number, default: 0 },
    // Validity period (in days)
    validityDays: { type: Number, default: 365 },
    // Created by admin
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    // Analytics
    purchaseCount: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
}, { timestamps: true });
// Indexes for better performance
SuggestionPackageSchema.index({ isActive: 1, sortOrder: 1 });
SuggestionPackageSchema.index({ price: 1, isActive: 1 });
SuggestionPackageSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const SuggestionPackage = mongoose_1.models?.SuggestionPackage || (0, mongoose_1.model)('SuggestionPackage', SuggestionPackageSchema);
exports.default = SuggestionPackage;
//# sourceMappingURL=SuggestionPackage.js.map