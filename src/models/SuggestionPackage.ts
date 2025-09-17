import mongoose, { Schema, models, model } from 'mongoose';

const SuggestionPackageSchema = new Schema({
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
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
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

const SuggestionPackage = models?.SuggestionPackage || model('SuggestionPackage', SuggestionPackageSchema);
export default SuggestionPackage;
