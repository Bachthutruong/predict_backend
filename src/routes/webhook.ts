import express, { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Order from '../models/order';
import User from '../models/user';
import PointTransaction from '../models/point-transaction'; // Import PointTransaction model
import { WooCommerceOrder } from '../types';

const router = express.Router();

// ⚠️ IMPORTANT: These webhook routes are PUBLIC - NO AUTHENTICATION REQUIRED
// WordPress/WooCommerce will call these endpoints directly
// Do NOT add authMiddleware or any authentication to these routes

// Debug middleware for all webhook routes
router.use((req: Request, res: Response, next: express.NextFunction) => {
  console.log(`🌐 Webhook ${req.method} ${req.path} from ${req.ip}`);
  console.log(`✅ WEBHOOK ROUTE: No rate limiting, no auth required`);
  console.log(`🔍 Rate Limit Headers Check:`, {
    'x-ratelimit-limit': res.getHeaders()['x-ratelimit-limit'] || 'NOT SET',
    'x-ratelimit-remaining': res.getHeaders()['x-ratelimit-remaining'] || 'NOT SET'
  });
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📦 Body preview:', JSON.stringify(req.body).substring(0, 200) + '...');
  next();
});

// Webhook signature validation middleware (DISABLED FOR DEBUG)
const validateWebhookSignature = (req: Request, res: Response, next: express.NextFunction) => {
  console.log('🔓 Webhook signature validation DISABLED for debugging');
  console.log('🔍 Webhook Headers:', {
    'x-wc-webhook-signature': req.headers['x-wc-webhook-signature'],
    'x-wc-webhook-source': req.headers['x-wc-webhook-source'],
    'x-wc-webhook-topic': req.headers['x-wc-webhook-topic'],
    'x-wc-webhook-resource': req.headers['x-wc-webhook-resource'],
    'x-wc-webhook-event': req.headers['x-wc-webhook-event'],
    'user-agent': req.headers['user-agent'],
    'content-type': req.headers['content-type']
  });
  
  // TEMPORARILY DISABLED: Skip all signature validation
  console.log('✅ All webhook requests allowed (signature validation disabled)');
  next();
};

// Helper function to generate default password
const generateRandomPassword = (): string => {
  return '123456789'; // Fixed default password
};

// Helper function to recalculate user points from completed orders only
const recalculateUserPointsFromOrders = async (customerEmail: string): Promise<number> => {
  try {
    // Get only COMPLETED orders for this customer
    const completedOrders = await Order.find({ 
      customerEmail, 
      status: 'completed' 
    });
    
    // Calculate total points from completed orders only
    let totalPoints = 0;
    for (const order of completedOrders) {
      const orderValue = parseFloat(order.total) || 0;
      totalPoints += orderValue;
    }
    
    console.log(`💰 Customer ${customerEmail}: ${completedOrders.length} completed orders = ${totalPoints} points`);
    return totalPoints;
  } catch (error) {
    console.error('❌ Error recalculating points:', error);
    return 0;
  }
};

// Helper function to create or update user from order data
const createOrUpdateUserFromOrder = async (
  wcOrder: any, 
  existingOrderInDb?: any
): Promise<any> => {
  try {
    const customerEmail = wcOrder.billing?.email;
    const customerName = `${wcOrder.billing?.first_name || 'Unknown'} ${wcOrder.billing?.last_name || 'Customer'}`;
    const orderTotal = parseFloat(wcOrder.total) || 0;
    const customerPhone = wcOrder.billing?.phone || '';
    
    if (!customerEmail || customerEmail === '') {
      console.log('⚠️ No customer email provided, skipping user creation/update.');
      return null;
    }

    const wasCompleted = existingOrderInDb?.status === 'completed';
    const isNowCompleted = wcOrder.status === 'completed';

    let user = await User.findOne({ email: customerEmail });

    if (!user) {
      // Create new user if they don't exist
      const randomPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      user = new User({
        name: customerName.trim(),
        email: customerEmail,
        password: hashedPassword,
        points: 0, // Start with 0 points
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=random`,
        phone: customerPhone,
        address: {
          street: wcOrder.billing?.address_1 || '',
          city: wcOrder.billing?.city || '',
          state: wcOrder.billing?.state || '',
          postalCode: wcOrder.billing?.postcode || '',
          country: wcOrder.billing?.country || ''
        },
        isAutoCreated: true,
        totalOrderValue: 0,
        isEmailVerified: true
      });
      await user.save();
      console.log(`🎉 New user created for email: ${customerEmail}`);
    }

    // Award points only when an order transitions to 'completed'
    if (isNowCompleted && !wasCompleted) {
      user.points = (user.points || 0) + orderTotal;
      user.totalOrderValue = (user.totalOrderValue || 0) + orderTotal;

      // Create a point transaction record
      await PointTransaction.create({
        userId: user.id,
        amount: orderTotal,
        reason: 'order-completion',
        notes: `Points awarded for completed WooCommerce order #${wcOrder.id}`,
      });

      console.log(`✅ Awarded ${orderTotal} points to ${customerEmail} for completed order #${wcOrder.id}. New balance: ${user.points}`);
    } else {
        console.log(`ℹ️ No points awarded for order #${wcOrder.id}. Status: ${wcOrder.status}, Was previously completed: ${wasCompleted}`);
    }

    // Always update user's contact info from the latest order
    if (!user.phone && customerPhone) user.phone = customerPhone;
    if (!user.address.street && wcOrder.billing?.address_1) {
      user.address.street = wcOrder.billing.address_1;
      user.address.city = wcOrder.billing?.city || '';
      user.address.state = wcOrder.billing?.state || '';
      user.address.postalCode = wcOrder.billing?.postcode || '';
      user.address.country = wcOrder.billing?.country || '';
    }
    
    await user.save();
    return user;

  } catch (error) {
    console.error('❌ Error in createOrUpdateUserFromOrder:', error);
    return null;
  }
};

// Helper function to clean object from empty strings
const cleanEmptyStrings = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  // Don't process Date objects - return them as-is
  if (obj instanceof Date) return obj;
  
  const cleaned: any = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value === '') {
      // Skip empty strings - let MongoDB use defaults
      continue;
    } else if (value instanceof Date) {
      // Preserve Date objects
      cleaned[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = cleanEmptyStrings(value);
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
};

// Helper function to transform WooCommerce order data to our format (flexible)
const transformWooCommerceOrder = (wcOrder: any) => {
  // Provide default values for missing fields and handle empty strings
  const billing = wcOrder.billing || {};
  const shipping = wcOrder.shipping || {};
  
  // Helper function to handle empty strings and ensure non-empty values
  const getValidValue = (value: any, defaultValue: string) => {
    return (value && value !== '' && value !== null && value !== undefined) ? String(value).trim() : defaultValue;
  };
  
  // Helper function to ensure non-empty required field
  const getRequiredValue = (value: any, defaultValue: string) => {
    const cleanValue = getValidValue(value, defaultValue);
    return cleanValue || defaultValue; // Double check to ensure never empty
  };
  
  console.log('🔍 Transform order data:', {
    orderId: wcOrder.id,
    paymentMethod: wcOrder.payment_method,
    paymentMethodTitle: wcOrder.payment_method_title,
    billingCountry: billing.country,
    shippingCountry: shipping.country
  });
  
  return {
    wordpressOrderId: wcOrder.id,
    status: getValidValue(wcOrder.status, 'pending'),
    customerEmail: getValidValue(billing.email, 'unknown@example.com'),
    customerName: `${getValidValue(billing.first_name, 'Unknown')} ${getValidValue(billing.last_name, 'Customer')}`,
    customerPhone: getValidValue(billing.phone, ''),
    total: getValidValue(wcOrder.total, '0.00'),
    currency: getValidValue(wcOrder.currency, 'USD'),
    paymentMethod: getRequiredValue(wcOrder.payment_method, 'unknown'),
    paymentMethodTitle: getRequiredValue(wcOrder.payment_method_title, 'Unknown Payment Method'),
    transactionId: getValidValue(wcOrder.transaction_id, ''),
    lineItems: Array.isArray(wcOrder.line_items) ? wcOrder.line_items : [],
    billingAddress: {
      first_name: getRequiredValue(billing.first_name, 'Unknown'),
      last_name: getRequiredValue(billing.last_name, 'Customer'),
      address_1: getRequiredValue(billing.address_1, 'Unknown Address'),
      city: getRequiredValue(billing.city, 'Unknown City'),
      state: getRequiredValue(billing.state, 'Unknown State'),
      postcode: getRequiredValue(billing.postcode, '00000'),
      country: getRequiredValue(billing.country, 'US'),
      email: getRequiredValue(billing.email, 'unknown@example.com'),
      phone: getValidValue(billing.phone, '')
    },
    shippingAddress: {
      first_name: getRequiredValue(shipping.first_name, getRequiredValue(billing.first_name, 'Unknown')),
      last_name: getRequiredValue(shipping.last_name, getRequiredValue(billing.last_name, 'Customer')),
      address_1: getRequiredValue(shipping.address_1, getRequiredValue(billing.address_1, 'Unknown Address')),
      city: getRequiredValue(shipping.city, getRequiredValue(billing.city, 'Unknown City')),
      state: getRequiredValue(shipping.state, getRequiredValue(billing.state, 'Unknown State')),
      postcode: getRequiredValue(shipping.postcode, getRequiredValue(billing.postcode, '00000')),
      country: getRequiredValue(shipping.country, getRequiredValue(billing.country, 'US'))
    },
    orderKey: getRequiredValue(wcOrder.order_key, `wc_order_${wcOrder.id}_${Date.now()}`),
    dateCreated: wcOrder.date_created && !isNaN(new Date(wcOrder.date_created).getTime()) 
      ? new Date(wcOrder.date_created) 
      : new Date(),
    dateModified: wcOrder.date_modified && !isNaN(new Date(wcOrder.date_modified).getTime()) 
      ? new Date(wcOrder.date_modified) 
      : new Date(),
    dateCompleted: wcOrder.date_completed ? new Date(wcOrder.date_completed) : undefined,
    datePaid: wcOrder.date_paid ? new Date(wcOrder.date_paid) : undefined,
    customerNote: getValidValue(wcOrder.customer_note, ''),
    metaData: Array.isArray(wcOrder.meta_data) ? wcOrder.meta_data.map((meta: any) => ({
      key: meta?.key || '',
      value: meta?.value || ''
    })) : [],
    isProcessed: false
  };
};

// Log webhook events for debugging
const logWebhookEvent = (eventType: string, orderId: number, status?: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Webhook Event: ${eventType} - Order ID: ${orderId}${status ? ` - Status: ${status}` : ''}`);
};

// Handle order created webhook (flexible for WordPress data)
router.post('/order/created', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Processing ORDER_CREATED webhook');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📋 Headers content-type:', req.headers['content-type']);
    
    const requestData = req.body;
    
    // Case 1: WordPress sends only webhook_id (common case)
    if (requestData.webhook_id && !requestData.id) {
      console.log(`📨 WordPress webhook_id: ${requestData.webhook_id}`);
      console.log('✅ Webhook received successfully - WordPress format');
      
      // Return success immediately to WordPress
      return res.status(200).json({
        success: true,
        message: 'WordPress webhook received successfully',
        webhook_id: requestData.webhook_id,
        note: 'This is a WordPress webhook notification',
        timestamp: new Date().toISOString()
      });
    }
    
    // Case 2: Full order data provided (API testing or advanced setup)
    const wcOrder: WooCommerceOrder = requestData;
    if (!wcOrder.id) {
      console.log('⚠️ No order ID provided - treating as notification only');
      return res.status(200).json({
        success: true,
        message: 'Webhook notification received',
        data: requestData,
        timestamp: new Date().toISOString()
      });
    }
    
    logWebhookEvent('ORDER_CREATED', wcOrder.id, wcOrder.status);
    
    // Log raw order data for debugging
    console.log('🔎 Raw order data before transform:', {
      id: wcOrder.id,
      status: wcOrder.status,
      payment_method: wcOrder.payment_method,
      payment_method_title: wcOrder.payment_method_title,
      billing: wcOrder.billing,
      shipping: wcOrder.shipping
    });
    
    // Always try to process the order, even with incomplete data
    // The transform function will handle missing fields with defaults
    
    // Check if order already exists
    const existingOrder = await Order.findOne({ wordpressOrderId: wcOrder.id });
    if (existingOrder) {
      console.log(`⚠️ Order ${wcOrder.id} already exists, skipping creation`);
      return res.status(200).json({
        success: true,
        message: 'Order already exists',
        data: { 
          orderId: wcOrder.id,
          internalId: existingOrder.id,
          status: existingOrder.status
        }
      });
    }
    
    // Transform and save new order
    try {
      const orderData = transformWooCommerceOrder(wcOrder);
      console.log('✅ Order data transformed for creation:', {
        orderId: orderData.wordpressOrderId,
        paymentMethod: orderData.paymentMethod,
        billingCountry: orderData.billingAddress.country,
        shippingCountry: orderData.shippingAddress.country
      });
      
      // Clean empty strings to let MongoDB use defaults
      const cleanedOrderData = cleanEmptyStrings(orderData);
      console.log('🧹 Cleaned order data for creation:', {
        orderId: cleanedOrderData.wordpressOrderId,
        paymentMethod: cleanedOrderData.paymentMethod,
        billingCountry: cleanedOrderData.billingAddress?.country,
        shippingCountry: cleanedOrderData.shippingAddress?.country
      });
      
      const newOrder = new Order(cleanedOrderData);
      await newOrder.save();
      
      // Auto-create or update user from order data
      console.log('👤 Creating/updating user from NEW order data...');
      await createOrUpdateUserFromOrder(wcOrder, undefined); // No existing DB order yet
      
      // Log successful creation
      console.log(`✅ Order ${wcOrder.id} created successfully in database`);
      console.log(`📊 Order details: ${wcOrder.billing?.email || 'Unknown'} - ${wcOrder.total} ${wcOrder.currency}`);
      
      // Return success response IMMEDIATELY to WordPress
      res.status(200).json({
        success: true,
        message: 'Order created successfully',
        data: {
          orderId: wcOrder.id,
          internalId: newOrder.id,
          status: wcOrder.status,
          total: wcOrder.total,
          currency: wcOrder.currency,
          customerEmail: wcOrder.billing?.email || 'Unknown',
          userCreated: 'new' // Indicate new user creation
        }
      });
    } catch (createError) {
      console.error('❌ Error creating new order:', createError);
      
      // Return success to prevent WordPress retries but log the error
      res.status(200).json({
        success: true,
        message: 'Webhook acknowledged - order creation failed',
        orderId: wcOrder.id,
        error: createError instanceof Error ? createError.message : 'Unknown error',
        note: 'Error in creation but webhook acknowledged to prevent retries'
      });
    }
    
  } catch (error) {
    console.error('❌ Error processing order created webhook:', error);
    console.error('📦 Request body that caused error:', JSON.stringify(req.body, null, 2));
    
    // Log error with order details for debugging
    if (req.body?.id) {
      try {
        await Order.findOneAndUpdate(
          { wordpressOrderId: req.body.id },
          { 
            processingError: error instanceof Error ? error.message : 'Unknown error',
            isProcessed: false
          },
          { upsert: false }
        );
      } catch (updateError) {
        console.error('Failed to update order with error:', updateError);
      }
    }
    
    // Always return 200 to prevent WordPress retries
    res.status(200).json({
      success: true, // Changed to true to prevent WordPress retries
      message: 'Webhook received - error in processing',
      error: error instanceof Error ? error.message : 'Unknown error',
      webhook_id: req.body?.webhook_id,
      note: 'Error occurred but webhook acknowledged to prevent retries'
    });
  }
});

// Handle order updated webhook (flexible for WordPress data)
router.post('/order/updated', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Processing ORDER_UPDATED webhook');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📋 Headers content-type:', req.headers['content-type']);
    
    const requestData = req.body;
    
    // Case 1: WordPress sends only webhook_id (common case)
    if (requestData.webhook_id && !requestData.id) {
      console.log(`📨 WordPress webhook_id: ${requestData.webhook_id}`);
      console.log('✅ Webhook received successfully - WordPress format');
      
      // Return success immediately to WordPress
      return res.status(200).json({
        success: true,
        message: 'WordPress webhook received successfully',
        webhook_id: requestData.webhook_id,
        note: 'This is a WordPress webhook notification',
        timestamp: new Date().toISOString()
      });
    }
    
    // Case 2: Full order data provided (API testing or advanced setup)
    const wcOrder: WooCommerceOrder = requestData;
    if (!wcOrder.id) {
      console.log('⚠️ No order ID provided - treating as notification only');
      return res.status(200).json({
        success: true,
        message: 'Webhook notification received',
        data: requestData,
        timestamp: new Date().toISOString()
      });
    }
    
    logWebhookEvent('ORDER_UPDATED', wcOrder.id, wcOrder.status);
    
    // Log raw order data for debugging
    console.log('🔎 Raw order data before transform:', {
      id: wcOrder.id,
      status: wcOrder.status,
      payment_method: wcOrder.payment_method,
      payment_method_title: wcOrder.payment_method_title,
      billing: wcOrder.billing,
      shipping: wcOrder.shipping
    });
    
    // Always try to process the order, even with incomplete data
    // The transform function will handle missing fields with defaults
    
    // Find existing order
    const existingOrder = await Order.findOne({ wordpressOrderId: wcOrder.id });
    
    if (!existingOrder) {
      // If order doesn't exist, create it
      console.log(`⚠️ Order ${wcOrder.id} not found, creating new order from update webhook`);
      
      try {
        const orderData = transformWooCommerceOrder(wcOrder);
        console.log('✅ Order data transformed successfully:', {
          orderId: orderData.wordpressOrderId,
          paymentMethod: orderData.paymentMethod,
          billingCountry: orderData.billingAddress.country,
          shippingCountry: orderData.shippingAddress.country
        });
        
        // Clean empty strings to let MongoDB use defaults
        const cleanedOrderData = cleanEmptyStrings(orderData);
        console.log('🧹 Cleaned order data:', {
          orderId: cleanedOrderData.wordpressOrderId,
          paymentMethod: cleanedOrderData.paymentMethod,
          billingCountry: cleanedOrderData.billingAddress?.country,
          shippingCountry: cleanedOrderData.shippingAddress?.country
        });
        
        const newOrder = new Order(cleanedOrderData);
        await newOrder.save();
        
        // Auto-create or update user from order data (NEW ORDER from update webhook)
        console.log('👤 Creating/updating user from NEW order data (from update webhook)...');
        await createOrUpdateUserFromOrder(wcOrder, undefined); // No existing DB order yet
        
        console.log(`✅ Order ${wcOrder.id} created from update webhook`);
        
        // Return success response IMMEDIATELY to WordPress
        res.status(200).json({
          success: true,
          message: 'Order created from update webhook',
          data: {
            orderId: wcOrder.id,
            internalId: newOrder.id,
            status: wcOrder.status,
            action: 'created',
            userCreated: 'new' // Indicate new user creation
          }
        });
      } catch (createError) {
        console.error('❌ Error creating order from update webhook:', createError);
        
        // Return success to prevent WordPress retries but log the error
        return res.status(200).json({
          success: true,
          message: 'Webhook acknowledged - order creation failed',
          orderId: wcOrder.id,
          error: createError instanceof Error ? createError.message : 'Unknown error',
          note: 'Error in creation but webhook acknowledged to prevent retries'
        });
      }
    }
    
    // Update existing order
    try {
      const orderData = transformWooCommerceOrder(wcOrder);
      console.log('✅ Order data transformed for update:', {
        orderId: orderData.wordpressOrderId,
        paymentMethod: orderData.paymentMethod,
        billingCountry: orderData.billingAddress.country,
        shippingCountry: orderData.shippingAddress.country
      });
      
      // Clean empty strings to let MongoDB use defaults
      const cleanedOrderData = cleanEmptyStrings(orderData);
      console.log('🧹 Cleaned order data for update:', {
        orderId: cleanedOrderData.wordpressOrderId,
        paymentMethod: cleanedOrderData.paymentMethod,
        billingCountry: cleanedOrderData.billingAddress?.country,
        shippingCountry: cleanedOrderData.shippingAddress?.country
      });
      
      const updatedOrder = await Order.findOneAndUpdate(
        { wordpressOrderId: wcOrder.id },
        {
          ...cleanedOrderData,
          isProcessed: true,
          processedAt: new Date(),
          processingError: null // Clear any previous errors
        },
        { new: true }
      );
      
      // Create/update user and award points if status changed to 'completed'
      console.log('👤 Updating user points based on order status change...');
      await createOrUpdateUserFromOrder(wcOrder, existingOrder); // Pass both new and old order data
      
      console.log(`✅ Order ${wcOrder.id} updated successfully - Status: ${wcOrder.status} (was: ${existingOrder.status})`);
      
      // You can add status-specific processing here
      switch (wcOrder.status) {
        case 'completed':
          console.log(`🎉 Order ${wcOrder.id} completed - Customer: ${wcOrder.billing?.email || 'Unknown'}`);
          // Add any completion logic here
          break;
        case 'cancelled':
          console.log(`❌ Order ${wcOrder.id} cancelled - Reason: Status change`);
          // Add any cancellation logic here
          break;
        case 'processing':
          console.log(`⏳ Order ${wcOrder.id} is now processing`);
          // Add any processing logic here
          break;
        default:
          console.log(`📝 Order ${wcOrder.id} status changed to: ${wcOrder.status}`);
      }
      
      // Return success response IMMEDIATELY to WordPress
      res.status(200).json({
        success: true,
        message: 'Order updated successfully',
        data: {
          orderId: wcOrder.id,
          internalId: updatedOrder?.id,
          status: wcOrder.status,
          previousStatus: existingOrder.status,
          action: 'updated'
        }
      });
    } catch (updateError) {
      console.error('❌ Error updating existing order:', updateError);
      
      // Update the order with error info but still return success
      try {
        await Order.findOneAndUpdate(
          { wordpressOrderId: wcOrder.id },
          { 
            processingError: updateError instanceof Error ? updateError.message : 'Unknown error',
            isProcessed: false,
            processedAt: new Date()
          }
        );
      } catch (logError) {
        console.error('Failed to log update error:', logError);
      }
      
      // Return success to prevent WordPress retries
      res.status(200).json({
        success: true,
        message: 'Webhook acknowledged - order update failed',
        orderId: wcOrder.id,
        error: updateError instanceof Error ? updateError.message : 'Unknown error',
        note: 'Error in update but webhook acknowledged to prevent retries'
      });
    }
    
  } catch (error) {
    console.error('❌ Error processing order updated webhook:', error);
    console.error('📦 Request body that caused error:', JSON.stringify(req.body, null, 2));
    
    // Log error with order details for debugging
    if (req.body?.id) {
      try {
        await Order.findOneAndUpdate(
          { wordpressOrderId: req.body.id },
          { 
            processingError: error instanceof Error ? error.message : 'Unknown error',
            isProcessed: false
          },
          { upsert: false }
        );
      } catch (updateError) {
        console.error('Failed to update order with error:', updateError);
      }
    }
    
    // Always return 200 to prevent WordPress retries
    res.status(200).json({
      success: true, // Changed to true to prevent WordPress retries
      message: 'Webhook received - error in processing',
      error: error instanceof Error ? error.message : 'Unknown error',
      webhook_id: req.body?.webhook_id,
      note: 'Error occurred but webhook acknowledged to prevent retries'
    });
  }
});

// Handle order deleted webhook (temporarily disable signature validation)
router.post('/order/deleted', async (req: Request, res: Response) => {
  try {
    const wcOrder: WooCommerceOrder = req.body;
    
    logWebhookEvent('ORDER_DELETED', wcOrder.id);
    
    // Find and update order as deleted instead of actually deleting
    const existingOrder = await Order.findOneAndUpdate(
      { wordpressOrderId: wcOrder.id },
      { 
        status: 'trash',
        isProcessed: true,
        processedAt: new Date()
      },
      { new: true }
    );
    
    if (!existingOrder) {
      console.log(`Order ${wcOrder.id} not found for deletion`);
      return res.json({
        success: true,
        message: 'Order not found',
        data: { orderId: wcOrder.id }
      });
    }
    
    console.log(`🗑️ Order ${wcOrder.id} marked as deleted`);
    
    res.json({
      success: true,
      message: 'Order marked as deleted',
      data: {
        orderId: wcOrder.id,
        internalId: existingOrder.id
      }
    });
    
  } catch (error) {
    console.error('Error processing order deleted webhook:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error processing order deleted webhook',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get webhook logs/status (for debugging)
router.get('/status', async (req: Request, res: Response) => {
  try {
    const totalOrders = await Order.countDocuments();
    const processedOrders = await Order.countDocuments({ isProcessed: true });
    const errorOrders = await Order.countDocuments({ processingError: { $exists: true, $ne: null } });
    
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('wordpressOrderId status customerEmail total currency createdAt isProcessed processingError');
    
    res.json({
      success: true,
      data: {
        stats: {
          totalOrders,
          processedOrders,
          errorOrders,
          pendingOrders: totalOrders - processedOrders
        },
        recentOrders
      }
    });
    
  } catch (error) {
    console.error('Error getting webhook status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting webhook status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoint (remove after debugging)
router.post('/test', async (req: Request, res: Response) => {
  console.log('🧪 Test webhook endpoint called');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  res.status(200).json({
    success: true,
    message: 'Test webhook received - NO AUTH REQUIRED',
    receivedData: {
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString(),
      note: 'This endpoint is PUBLIC and requires no authentication',
      middleware_passed: 'All middleware successfully bypassed',
      rate_limiting: 'EXCLUDED',
      authentication: 'NONE',
      cors: 'ALLOWED_ALL'
    }
  });
});

// Super simple test endpoint - absolutely no checks
router.all('/simple-test', async (req: Request, res: Response) => {
  console.log('🚀 SIMPLE TEST ENDPOINT HIT');
  console.log('📍 Current time:', new Date().toISOString());
  console.log('📍 Request method:', req.method);
  console.log('📍 Request IP:', req.ip);
  res.status(200).json({
    success: true,
    message: 'WEBHOOK WORKING - WordPress webhook_id support enabled',
    timestamp: new Date().toISOString(),
    method: req.method,
    ip: req.ip,
    version: '2.0 - WordPress compatible'
  });
});

// Test endpoint specifically for WordPress webhook format
router.all('/wordpress-test', async (req: Request, res: Response) => {
  console.log('🔧 WORDPRESS TEST ENDPOINT HIT');
  console.log('📦 Body:', req.body);
  console.log('📋 Content-Type:', req.headers['content-type']);
  
  if (req.body.webhook_id) {
    res.status(200).json({
      success: true,
      message: 'WordPress webhook format detected and handled',
      webhook_id: req.body.webhook_id,
      timestamp: new Date().toISOString(),
      note: 'This confirms WordPress webhook support is working'
    });
  } else {
    res.status(200).json({
      success: true,
      message: 'Test endpoint - no webhook_id found',
      body: req.body,
      timestamp: new Date().toISOString()
    });
  }
});

// GET endpoint to confirm webhooks are public
router.get('/public-status', async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Webhook endpoints are PUBLIC',
    endpoints: {
      '/api/webhook/test': 'Test endpoint - POST',
      '/api/webhook/order/created': 'Order created webhook - POST',
      '/api/webhook/order/updated': 'Order updated webhook - POST', 
      '/api/webhook/order/deleted': 'Order deleted webhook - POST',
      '/api/webhook/status': 'Webhook status - GET'
    },
    authentication: 'NONE REQUIRED',
    note: 'These endpoints are designed to be called by WordPress/WooCommerce without authentication'
  });
});

// Error handler for webhook routes
router.use((error: any, req: Request, res: Response, next: express.NextFunction) => {
  console.error('❌ WEBHOOK ERROR HANDLER:', error);
  console.error('❌ Request path:', req.path);
  console.error('❌ Request method:', req.method);
  console.error('❌ Request headers:', req.headers);
  
  // Always return 200 for webhooks to prevent retries
  res.status(200).json({
    success: false,
    message: 'Webhook error handled',
    error: error.message,
    note: 'Error occurred but returning 200 to prevent WordPress retries'
  });
});

export default router; 