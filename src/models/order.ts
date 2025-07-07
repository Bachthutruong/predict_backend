import mongoose, { Schema, models, model } from 'mongoose';

const OrderSchema = new Schema({
  // WordPress/WooCommerce Order ID
  wordpressOrderId: { type: Number, required: false, unique: true, index: true },
  
  // Order Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'trash', 'ecpay-shipping'],
    required: false,
    index: true,
    default: 'pending'
  },
  
  // Customer Information
  customerEmail: { type: String, required: false, index: true, default: 'unknown@example.com' },
  customerName: { type: String, required: false, default: 'Unknown Customer' },
  customerPhone: { type: String },
  
  // Order Financial Information
  total: { type: String, required: false, default: '0' },
  currency: { type: String, required: false, default: 'TWD' },
  
  // Payment Information
  paymentMethod: { type: String, required: false, default: 'unknown' },
  paymentMethodTitle: { type: String, required: false, default: 'Unknown Payment Method' },
  transactionId: { type: String },
  
  // Order Items
  lineItems: [{
    id: { type: Number, required: false },
    name: { type: String, required: false, default: 'Unknown Product' },
    product_id: { type: Number, required: false },
    variation_id: { type: Number, default: 0 },
    quantity: { type: Number, required: false, default: 1 },
    tax_class: { type: String, default: '' },
    subtotal: { type: String, required: false, default: '0' },
    subtotal_tax: { type: String, default: '0' },
    total: { type: String, required: false, default: '0' },
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
    price: { type: Number, required: false, default: 0 },
    image: {
      id: { type: Number },
      src: { type: String }
    },
    parent_name: { type: String }
  }],
  
  // Billing Address
  billingAddress: {
    first_name: { type: String, required: false, default: 'Unknown' },
    last_name: { type: String, required: false, default: 'Customer' },
    company: { type: String, default: '' },
    address_1: { type: String, required: false, default: 'Unknown Address' },
    address_2: { type: String, default: '' },
    city: { type: String, required: false, default: 'Unknown City' },
    state: { type: String, required: false, default: 'Unknown State' },
    postcode: { type: String, required: false, default: '00000' },
    country: { type: String, required: false, default: 'US' },
    email: { type: String, required: false, default: 'unknown@example.com' },
    phone: { type: String, default: '' }
  },
  
  // Shipping Address
  shippingAddress: {
    first_name: { type: String, required: false, default: 'Unknown' },
    last_name: { type: String, required: false, default: 'Customer' },
    company: { type: String, default: '' },
    address_1: { type: String, required: false, default: 'Unknown Address' },
    address_2: { type: String, default: '' },
    city: { type: String, required: false, default: 'Unknown City' },
    state: { type: String, required: false, default: 'Unknown State' },
    postcode: { type: String, required: false, default: '00000' },
    country: { type: String, required: false, default: 'US' }
  },
  
  // Order Key
  orderKey: { type: String, required: false, unique: true },
  
  // Important Dates
  dateCreated: { type: Date, required: false },
  dateModified: { type: Date, required: false },
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