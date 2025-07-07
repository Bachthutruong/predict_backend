import mongoose, { Schema, models, model } from 'mongoose';

const OrderSchema = new Schema({
  // WordPress/WooCommerce Order ID
  wordpressOrderId: { type: Number, required: true, unique: true, index: true },
  
  // Order Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'trash', 'ecpay-shipping'],
    required: true,
    index: true
  },
  
  // Customer Information
  customerEmail: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String },
  
  // Order Financial Information
  total: { type: String, required: true },
  currency: { type: String, required: true, default: 'TWD' },
  
  // Payment Information
  paymentMethod: { type: String, required: true },
  paymentMethodTitle: { type: String, required: true },
  transactionId: { type: String },
  
  // Order Items
  lineItems: [{
    id: { type: Number, required: true },
    name: { type: String, required: true },
    product_id: { type: Number, required: true },
    variation_id: { type: Number, default: 0 },
    quantity: { type: Number, required: true },
    tax_class: { type: String, default: '' },
    subtotal: { type: String, required: true },
    subtotal_tax: { type: String, default: '0' },
    total: { type: String, required: true },
    total_tax: { type: String, default: '0' },
    taxes: [{
      id: { type: Number },
      total: { type: String },
      subtotal: { type: String }
    }],
    meta_data: [{
      id: { type: Number },
      key: { type: String },
      value: { type: Schema.Types.Mixed }
    }],
    sku: { type: String },
    price: { type: Number, required: true },
    image: {
      id: { type: Number },
      src: { type: String }
    },
    parent_name: { type: String }
  }],
  
  // Billing Address
  billingAddress: {
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    company: { type: String, default: '' },
    address_1: { type: String, required: true },
    address_2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postcode: { type: String, required: true },
    country: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' }
  },
  
  // Shipping Address
  shippingAddress: {
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    company: { type: String, default: '' },
    address_1: { type: String, required: true },
    address_2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postcode: { type: String, required: true },
    country: { type: String, required: true }
  },
  
  // Order Key
  orderKey: { type: String, required: true, unique: true },
  
  // Important Dates
  dateCreated: { type: Date, required: true },
  dateModified: { type: Date, required: true },
  dateCompleted: { type: Date },
  datePaid: { type: Date },
  
  // Additional Information
  customerNote: { type: String, default: '' },
  metaData: [{
    key: { type: String },
    value: { type: Schema.Types.Mixed }
  }],
  
  // Processing Status
  isProcessed: { type: Boolean, default: false },
  processedAt: { type: Date },
  processingError: { type: String }
  
}, { timestamps: true });

// Compound indexes for better query performance
OrderSchema.index({ wordpressOrderId: 1, status: 1 });
OrderSchema.index({ customerEmail: 1, status: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ dateCreated: -1, status: 1 });
OrderSchema.index({ isProcessed: 1, status: 1 });

// Pre-save middleware could be added here if needed

// Transform output to match frontend expectations
OrderSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Virtual for formatted total
OrderSchema.virtual('formattedTotal').get(function() {
  return `${this.currency} ${this.total}`;
});

// Virtual for customer full name
OrderSchema.virtual('customerFullName').get(function() {
  return this.billingAddress ? `${this.billingAddress.first_name} ${this.billingAddress.last_name}` : this.customerName;
});

// Static methods
OrderSchema.statics.findByWordPressId = function(wordpressOrderId: number) {
  return this.findOne({ wordpressOrderId });
};

OrderSchema.statics.findByStatus = function(status: string) {
  return this.find({ status }).sort({ createdAt: -1 });
};

OrderSchema.statics.findByCustomerEmail = function(customerEmail: string) {
  return this.find({ customerEmail }).sort({ createdAt: -1 });
};

const Order = models?.Order || model('Order', OrderSchema);

export default Order; 