"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const PredictionSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: false },
    'data-ai-hint': { type: String },
    answer: { type: String, required: true },
    pointsCost: { type: Number, required: true },
    status: { type: String, enum: ['active', 'finished'], default: 'active' },
    authorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    winnerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
// Add a toJSON transform to convert _id to id
PredictionSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const Prediction = mongoose_1.models?.Prediction || (0, mongoose_1.model)('Prediction', PredictionSchema);
exports.default = Prediction;
//# sourceMappingURL=prediction.js.map