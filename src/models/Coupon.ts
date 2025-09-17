import mongoose, { Schema, models, model } from 'mongoose';

const CouponSchema = new Schema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  
  // Discount type
  discountType: { 
    type: String, 
    enum: ['percentage', 'fixed_amount', 'free_shipping'],
    required: true 
  },
  discountValue: { type: Number, required: true, min: 0 },
  
  // Usage limits
  usageLimit: { type: Number, default: null }, // null = unlimited
  usedCount: { type: Number, default: 0 },
  usageLimitPerUser: { type: Number, default: 1 },
  
  // Minimum requirements
  minimumOrderAmount: { type: Number, default: 0 },
  minimumQuantity: { type: Number, default: 0 },
  
  // Product restrictions
  applicableProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  applicableCategories: [{ type: String }],
  excludedProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  
  // User restrictions
  applicableUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  newUserOnly: { type: Boolean, default: false },
  
  // Validity (defaults added so creation works without explicit dates)
  validFrom: { type: Date, required: false, default: () => new Date() },
  validUntil: { type: Date, required: false, default: () => new Date(Date.now() + 365*24*60*60*1000) },
  isActive: { type: Boolean, default: true, index: true },
  
  // Deprecated: points bonus removed from business rules. Keep field for backward compatibility but unused.
  pointsBonus: { type: Number, default: 0 },
  
  // Created by admin
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Analytics
  totalDiscountGiven: { type: Number, default: 0 },
  totalOrdersAffected: { type: Number, default: 0 },
  
}, { timestamps: true });

// Indexes for better performance
CouponSchema.index({ code: 1, isActive: 1 });
CouponSchema.index({ validFrom: 1, validUntil: 1, isActive: 1 });
CouponSchema.index({ discountType: 1, isActive: 1 });

// Check if coupon is valid
CouponSchema.methods.isValid = function() {
  const now = new Date();
  return this.isActive && 
         this.validFrom <= now && 
         this.validUntil >= now &&
         (this.usageLimit === null || this.usedCount < this.usageLimit);
};

// Check if user can use this coupon
CouponSchema.methods.canBeUsedBy = function(userId: string, orderAmount: number, orderItems: any[]) {
  if (!this.isValid()) return false;
  
  // Check if user is in allowed users list
  if (this.applicableUsers.length > 0 && !this.applicableUsers.includes(userId)) {
    return false;
  }
  
  // Check minimum order amount
  if (orderAmount < this.minimumOrderAmount) {
    return false;
  }
  
  // Check minimum quantity
  const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  if (totalQuantity < this.minimumQuantity) {
    return false;
  }
  
  // Check product restrictions
  if (this.applicableProducts.length > 0) {
    const orderProductIds = orderItems.map(item => item.product.toString());
    const hasApplicableProduct = this.applicableProducts.some((productId: string) => 
      orderProductIds.includes(productId.toString())
    );
    if (!hasApplicableProduct) return false;
  }
  
  // Check excluded products
  if (this.excludedProducts.length > 0) {
    const orderProductIds = orderItems.map(item => item.product.toString());
    const hasExcludedProduct = this.excludedProducts.some((productId: string) => 
      orderProductIds.includes(productId.toString())
    );
    if (hasExcludedProduct) return false;
  }
  
  return true;
};

CouponSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Coupon = models?.Coupon || model('Coupon', CouponSchema);
export default Coupon;
