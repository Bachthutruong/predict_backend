"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'staff'], default: 'user', index: true },
    points: { type: Number, default: 0, index: true },
    avatarUrl: { type: String, required: true },
    checkInStreak: { type: Number, default: 0 },
    lastCheckIn: { type: Date },
    isEmailVerified: { type: Boolean, default: false, index: true },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    referralCode: { type: String, unique: true, sparse: true, index: true },
    referredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    consecutiveCheckIns: { type: Number, default: 0, index: true },
    lastCheckInDate: { type: Date, index: true },
    totalSuccessfulReferrals: { type: Number, default: 0 },
}, { timestamps: true });
// Compound indexes for better query performance
UserSchema.index({ email: 1, isEmailVerified: 1 });
UserSchema.index({ role: 1, createdAt: -1 });
UserSchema.index({ points: -1, role: 1 });
UserSchema.index({ consecutiveCheckIns: -1, lastCheckInDate: -1 });
// Generate unique referral code before saving
UserSchema.pre('save', function (next) {
    if (!this.referralCode) {
        this.referralCode = `REF${this.name.replace(/\s+/g, '').toUpperCase()}${Date.now().toString().slice(-4)}`;
    }
    next();
});
UserSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password; // Don't send password in JSON
        delete ret.emailVerificationToken; // Don't send verification token
        delete ret.emailVerificationExpires;
    },
});
const User = mongoose_1.models?.User || (0, mongoose_1.model)('User', UserSchema);
exports.default = User;
//# sourceMappingURL=user.js.map