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
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  items: [CartItemSchema],
  coupon: { type: Schema.Types.ObjectId, ref: 'Coupon' },
  couponCode: { type: String, default: '' },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Update lastUpdated when cart is modified
CartSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Indexes for better performance
CartSchema.index({ user: 1 });
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
