import { Schema, model, models } from 'mongoose';

const NewsArticleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    summary: { type: String, default: '' },
    content: { type: String, required: true },
    coverImage: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: { type: Date },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

NewsArticleSchema.index({ status: 1, publishedAt: -1, createdAt: -1 });

NewsArticleSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const NewsArticle = models?.NewsArticle || model('NewsArticle', NewsArticleSchema);

export default NewsArticle;
