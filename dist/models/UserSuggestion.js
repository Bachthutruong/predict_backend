"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const UserSuggestionSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    package: { type: mongoose_1.Schema.Types.ObjectId, ref: 'SuggestionPackage', required: true },
    // Suggestion counts
    totalSuggestions: { type: Number, required: true, min: 0 },
    usedSuggestions: { type: Number, default: 0, min: 0 },
    remainingSuggestions: { type: Number, required: true, min: 0 },
    // Validity
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    isActive: { type: Boolean, default: true, index: true },
    // Purchase info
    purchasePrice: { type: Number, required: true },
    orderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Order' },
}, { timestamps: true });
// Calculate remaining suggestions before saving
UserSuggestionSchema.pre('save', function (next) {
    this.remainingSuggestions = this.totalSuggestions - this.usedSuggestions;
    next();
});
// Indexes for better performance
UserSuggestionSchema.index({ user: 1, isActive: 1 });
UserSuggestionSchema.index({ validUntil: 1, isActive: 1 });
UserSuggestionSchema.index({ user: 1, validUntil: 1, isActive: 1 });
// Check if user can use suggestion
UserSuggestionSchema.methods.canUseSuggestion = function () {
    const now = new Date();
    return this.isActive &&
        this.validFrom <= now &&
        this.validUntil >= now &&
        this.remainingSuggestions > 0;
};
// Use a suggestion
UserSuggestionSchema.methods.useSuggestion = function () {
    if (this.canUseSuggestion()) {
        this.usedSuggestions += 1;
        this.remainingSuggestions = this.totalSuggestions - this.usedSuggestions;
        return true;
    }
    return false;
};
UserSuggestionSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const UserSuggestion = mongoose_1.models?.UserSuggestion || (0, mongoose_1.model)('UserSuggestion', UserSuggestionSchema);
exports.default = UserSuggestion;
//# sourceMappingURL=UserSuggestion.js.map