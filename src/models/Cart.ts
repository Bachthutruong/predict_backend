import mongoose, { Schema, models, model } from 'mongoose';

const CartItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  variant: {
    name: { type: String, default: '' },
    value: { type: String, default: '' }
  },
  addedAt: { type: Date, default: Date.now }
});

const CartSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' }, // Remove index: true to avoid auto-index
  guestId: { type: String }, // Remove index: true to avoid auto-index
  items: [CartItemSchema],
  coupon: { type: Schema.Types.ObjectId, ref: 'Coupon' },
  couponCode: { type: String, default: '' },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Unique index for user - only when user exists and is not null
// This allows multiple carts with user: null (guest carts)
// Using partialFilterExpression to exclude null values from unique constraint
CartSchema.index({ user: 1 }, { 
  unique: true, 
  sparse: true, 
  partialFilterExpression: { user: { $type: 'objectId' } } 
});

// Unique index for guestId - only when guestId exists and is not empty
// Each guest can have only one cart
CartSchema.index({ guestId: 1 }, { 
  unique: true, 
  sparse: true, 
  partialFilterExpression: { guestId: { $exists: true, $type: 'string', $ne: '' } } 
});

// Validation: either user or guestId must exist
CartSchema.pre('validate', function(next) {
  if (!this.user && !this.guestId) {
    return next(new Error('Cart must have either user or guestId'));
  }
  if (this.user && this.guestId) {
    return next(new Error('Cart cannot have both user and guestId'));
  }
  next();
});

// Update lastUpdated when cart is modified
CartSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Indexes for better performance
CartSchema.index({ lastUpdated: -1 });

CartSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Cart = models?.Cart || model('Cart', CartSchema);
export default Cart;
