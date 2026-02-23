"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const NewsArticleSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    summary: { type: String, default: '' },
    content: { type: String, required: true },
    coverImage: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: { type: Date },
    author: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
NewsArticleSchema.index({ status: 1, publishedAt: -1, createdAt: -1 });
NewsArticleSchema.set('toJSON', {
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const NewsArticle = mongoose_1.models?.NewsArticle || (0, mongoose_1.model)('NewsArticle', NewsArticleSchema);
exports.default = NewsArticle;
//# sourceMappingURL=NewsArticle.js.map