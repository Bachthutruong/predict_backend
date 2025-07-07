import express, { Request, Response } from 'express';
import crypto from 'crypto';
import Order from '../models/order';
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

// Helper function to transform WooCommerce order data to our format (flexible)
const transformWooCommerceOrder = (wcOrder: any) => {
  // Provide default values for missing fields
  const billing = wcOrder.billing || {};
  const shipping = wcOrder.shipping || {};
  
  return {
    wordpressOrderId: wcOrder.id,
    status: wcOrder.status || 'pending',
    customerEmail: billing.email || 'unknown@example.com',
    customerName: `${billing.first_name || 'Unknown'} ${billing.last_name || 'Customer'}`,
    customerPhone: billing.phone || '',
    total: wcOrder.total || '0.00',
    currency: wcOrder.currency || 'USD',
    paymentMethod: wcOrder.payment_method || 'unknown',
    paymentMethodTitle: wcOrder.payment_method_title || 'Unknown Payment Method',
    transactionId: wcOrder.transaction_id || '',
    lineItems: wcOrder.line_items || [],
    billingAddress: {
      first_name: billing.first_name || 'Unknown',
      last_name: billing.last_name || 'Customer',
      address_1: billing.address_1 || 'Unknown Address',
      city: billing.city || 'Unknown City',
      state: billing.state || 'Unknown State',
      postcode: billing.postcode || '00000',
      country: billing.country || 'US',
      email: billing.email || 'unknown@example.com',
      phone: billing.phone || ''
    },
    shippingAddress: {
      first_name: shipping.first_name || billing.first_name || 'Unknown',
      last_name: shipping.last_name || billing.last_name || 'Customer',
      address_1: shipping.address_1 || billing.address_1 || 'Unknown Address',
      city: shipping.city || billing.city || 'Unknown City',
      state: shipping.state || billing.state || 'Unknown State',
      postcode: shipping.postcode || billing.postcode || '00000',
      country: shipping.country || billing.country || 'US'
    },
    orderKey: wcOrder.order_key || `wc_order_${Date.now()}`,
    dateCreated: wcOrder.date_created ? new Date(wcOrder.date_created) : new Date(),
    dateModified: wcOrder.date_modified ? new Date(wcOrder.date_modified) : new Date(),
    dateCompleted: wcOrder.date_completed ? new Date(wcOrder.date_completed) : undefined,
    datePaid: wcOrder.date_paid ? new Date(wcOrder.date_paid) : undefined,
    customerNote: wcOrder.customer_note || '',
    metaData: (wcOrder.meta_data || []).map((meta: any) => ({
      key: meta.key,
      value: meta.value
    })),
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
    
    // Validate essential order data for full processing
    if (!wcOrder.billing || !wcOrder.billing.email) {
      console.log('⚠️ Incomplete order data - cannot process, but acknowledging webhook');
      return res.status(200).json({
        success: true,
        message: 'Webhook acknowledged - incomplete order data',
        orderId: wcOrder.id,
        timestamp: new Date().toISOString()
      });
    }
    
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
    const orderData = transformWooCommerceOrder(wcOrder);
    const newOrder = new Order(orderData);
    await newOrder.save();
    
    // Log successful creation
    console.log(`✅ Order ${wcOrder.id} created successfully in database`);
    console.log(`📊 Order details: ${wcOrder.billing.email} - ${wcOrder.total} ${wcOrder.currency}`);
    
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
        customerEmail: wcOrder.billing.email
      }
    });
    
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
    
    // Validate essential order data for full processing
    if (!wcOrder.billing || !wcOrder.billing.email) {
      console.log('⚠️ Incomplete order data - cannot process, but acknowledging webhook');
      return res.status(200).json({
        success: true,
        message: 'Webhook acknowledged - incomplete order data',
        orderId: wcOrder.id,
        timestamp: new Date().toISOString()
      });
    }
    
    // Find existing order
    const existingOrder = await Order.findOne({ wordpressOrderId: wcOrder.id });
    
    if (!existingOrder) {
      // If order doesn't exist, create it
      console.log(`⚠️ Order ${wcOrder.id} not found, creating new order from update webhook`);
      const orderData = transformWooCommerceOrder(wcOrder);
      const newOrder = new Order(orderData);
      await newOrder.save();
      
      console.log(`✅ Order ${wcOrder.id} created from update webhook`);
      
      return res.status(200).json({
        success: true,
        message: 'Order created from update webhook',
        data: {
          orderId: wcOrder.id,
          internalId: newOrder.id,
          status: wcOrder.status,
          action: 'created'
        }
      });
    }
    
    // Update existing order
    const orderData = transformWooCommerceOrder(wcOrder);
    const updatedOrder = await Order.findOneAndUpdate(
      { wordpressOrderId: wcOrder.id },
      {
        ...orderData,
        isProcessed: true,
        processedAt: new Date(),
        processingError: null // Clear any previous errors
      },
      { new: true }
    );
    
    console.log(`✅ Order ${wcOrder.id} updated successfully - Status: ${wcOrder.status} (was: ${existingOrder.status})`);
    
    // You can add status-specific processing here
    switch (wcOrder.status) {
      case 'completed':
        console.log(`🎉 Order ${wcOrder.id} completed - Customer: ${wcOrder.billing.email}`);
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
    message: 'WEBHOOK WORKING - Rate limiting completely disabled',
    timestamp: new Date().toISOString(),
    method: req.method,
    ip: req.ip
  });
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