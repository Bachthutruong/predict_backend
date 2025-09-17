import mongoose, { Schema, models, model } from 'mongoose';

const OrderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 }, // Price at time of purchase
  pointsUsed: { type: Number, default: 0 }, // Points used for this item
  pointsEarned: { type: Number, default: 0 }, // Points earned from this item
  variant: {
    name: { type: String, default: '' },
    value: { type: String, default: '' }
  }
});

const OrderSchema = new Schema({
  orderNumber: { type: String, unique: true, required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  // Order items
  items: [OrderItemSchema],
  
  // Pricing
  subtotal: { type: Number, required: true, min: 0 },
  shippingCost: { type: Number, default: 0, min: 0 },
  discountAmount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  
  // Points
  pointsUsed: { type: Number, default: 0 },
  pointsEarned: { type: Number, default: 0 },
  
  // Coupon
  coupon: { type: Schema.Types.ObjectId, ref: 'Coupon' },
  couponCode: { type: String, default: '' },
  
  // Payment
  paymentMethod: { 
    type: String, 
    enum: ['bank_transfer', 'cod'], // cod = cash on delivery
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'waiting_confirmation', 'paid', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  
  // Order status
  status: { 
    type: String, 
    enum: ['pending', 'waiting_payment', 'waiting_confirmation', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Shipping information
  shippingAddress: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    notes: { type: String, default: '' }
  },
  
  // Tracking
  trackingNumber: { type: String, default: '' },
  shippedAt: { type: Date },
  deliveredAt: { type: Date },
  
  // Payment confirmation
  paymentConfirmation: {
    image: { type: String, default: '' }, // Screenshot of transfer
    note: { type: String, default: '' },
    submittedAt: { type: Date }
  },
  
  // Admin notes
  adminNotes: { type: String, default: '' },
  
  // Cancellation
  cancelledAt: { type: Date },
  cancellationReason: { type: String, default: '' },
  cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  
  // Points refunded when cancelled
  pointsRefunded: { type: Boolean, default: false },
  
}, { timestamps: true, strictPopulate: false });

// Ensure order number exists before validation
OrderSchema.pre('validate', function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `ORD${timestamp}${random}`;
  }
  next();
});

// Indexes for better performance
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, status: 1 });
OrderSchema.index({ orderNumber: 1 });

OrderSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Order = models?.Order || model('Order', OrderSchema);
export default Order;