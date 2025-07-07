"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const order_1 = __importDefault(require("../models/order"));
const router = express_1.default.Router();
// Webhook signature validation middleware
const validateWebhookSignature = (req, res, next) => {
    const signature = req.headers['x-wc-webhook-signature'];
    const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;
    if (!secret) {
        console.error('WOOCOMMERCE_WEBHOOK_SECRET is not set');
        return res.status(500).json({
            success: false,
            message: 'Webhook secret not configured'
        });
    }
    if (!signature) {
        console.error('No webhook signature provided');
        return res.status(401).json({
            success: false,
            message: 'No webhook signature provided'
        });
    }
    try {
        const body = JSON.stringify(req.body);
        const expectedSignature = crypto_1.default
            .createHmac('sha256', secret)
            .update(body, 'utf8')
            .digest('base64');
        if (signature !== expectedSignature) {
            console.error('Invalid webhook signature');
            return res.status(401).json({
                success: false,
                message: 'Invalid webhook signature'
            });
        }
        next();
    }
    catch (error) {
        console.error('Error validating webhook signature:', error);
        return res.status(500).json({
            success: false,
            message: 'Error validating webhook signature'
        });
    }
};
// Helper function to transform WooCommerce order data to our format
const transformWooCommerceOrder = (wcOrder) => {
    return {
        wordpressOrderId: wcOrder.id,
        status: wcOrder.status,
        customerEmail: wcOrder.billing.email,
        customerName: `${wcOrder.billing.first_name} ${wcOrder.billing.last_name}`,
        customerPhone: wcOrder.billing.phone,
        total: wcOrder.total,
        currency: wcOrder.currency,
        paymentMethod: wcOrder.payment_method,
        paymentMethodTitle: wcOrder.payment_method_title,
        transactionId: wcOrder.transaction_id,
        lineItems: wcOrder.line_items,
        billingAddress: wcOrder.billing,
        shippingAddress: wcOrder.shipping,
        orderKey: wcOrder.order_key,
        dateCreated: new Date(wcOrder.date_created),
        dateModified: new Date(wcOrder.date_modified),
        dateCompleted: wcOrder.date_completed ? new Date(wcOrder.date_completed) : undefined,
        datePaid: wcOrder.date_paid ? new Date(wcOrder.date_paid) : undefined,
        customerNote: wcOrder.customer_note,
        metaData: wcOrder.meta_data.map(meta => ({
            key: meta.key,
            value: meta.value
        })),
        isProcessed: false
    };
};
// Log webhook events for debugging
const logWebhookEvent = (eventType, orderId, status) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Webhook Event: ${eventType} - Order ID: ${orderId}${status ? ` - Status: ${status}` : ''}`);
};
// Handle order created webhook
router.post('/order/created', validateWebhookSignature, async (req, res) => {
    try {
        const wcOrder = req.body;
        logWebhookEvent('ORDER_CREATED', wcOrder.id, wcOrder.status);
        // Check if order already exists
        const existingOrder = await order_1.default.findOne({ wordpressOrderId: wcOrder.id });
        if (existingOrder) {
            console.log(`Order ${wcOrder.id} already exists, skipping creation`);
            return res.json({
                success: true,
                message: 'Order already exists',
                data: { orderId: wcOrder.id }
            });
        }
        // Transform and save new order
        const orderData = transformWooCommerceOrder(wcOrder);
        const newOrder = new order_1.default(orderData);
        await newOrder.save();
        // Log successful creation
        console.log(`✅ Order ${wcOrder.id} created successfully in database`);
        // You can add additional processing here
        // For example: send notifications, trigger other services, etc.
        res.json({
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
    }
    catch (error) {
        console.error('Error processing order created webhook:', error);
        // Log error with order details for debugging
        if (req.body?.id) {
            await order_1.default.findOneAndUpdate({ wordpressOrderId: req.body.id }, {
                processingError: error instanceof Error ? error.message : 'Unknown error',
                isProcessed: false
            }, { upsert: false });
        }
        res.status(500).json({
            success: false,
            message: 'Error processing order created webhook',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Handle order updated webhook
router.post('/order/updated', validateWebhookSignature, async (req, res) => {
    try {
        const wcOrder = req.body;
        logWebhookEvent('ORDER_UPDATED', wcOrder.id, wcOrder.status);
        // Find existing order
        const existingOrder = await order_1.default.findOne({ wordpressOrderId: wcOrder.id });
        if (!existingOrder) {
            // If order doesn't exist, create it
            console.log(`Order ${wcOrder.id} not found, creating new order`);
            const orderData = transformWooCommerceOrder(wcOrder);
            const newOrder = new order_1.default(orderData);
            await newOrder.save();
            console.log(`✅ Order ${wcOrder.id} created from update webhook`);
            return res.json({
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
        const updatedOrder = await order_1.default.findOneAndUpdate({ wordpressOrderId: wcOrder.id }, {
            ...orderData,
            isProcessed: true,
            processedAt: new Date(),
            processingError: null // Clear any previous errors
        }, { new: true });
        console.log(`✅ Order ${wcOrder.id} updated successfully - Status: ${wcOrder.status}`);
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
        res.json({
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
    }
    catch (error) {
        console.error('Error processing order updated webhook:', error);
        // Log error with order details for debugging
        if (req.body?.id) {
            await order_1.default.findOneAndUpdate({ wordpressOrderId: req.body.id }, {
                processingError: error instanceof Error ? error.message : 'Unknown error',
                isProcessed: false
            }, { upsert: false });
        }
        res.status(500).json({
            success: false,
            message: 'Error processing order updated webhook',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Handle order deleted webhook
router.post('/order/deleted', validateWebhookSignature, async (req, res) => {
    try {
        const wcOrder = req.body;
        logWebhookEvent('ORDER_DELETED', wcOrder.id);
        // Find and update order as deleted instead of actually deleting
        const existingOrder = await order_1.default.findOneAndUpdate({ wordpressOrderId: wcOrder.id }, {
            status: 'trash',
            isProcessed: true,
            processedAt: new Date()
        }, { new: true });
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
    }
    catch (error) {
        console.error('Error processing order deleted webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing order deleted webhook',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get webhook logs/status (for debugging)
router.get('/status', async (req, res) => {
    try {
        const totalOrders = await order_1.default.countDocuments();
        const processedOrders = await order_1.default.countDocuments({ isProcessed: true });
        const errorOrders = await order_1.default.countDocuments({ processingError: { $exists: true, $ne: null } });
        const recentOrders = await order_1.default.find()
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
    }
    catch (error) {
        console.error('Error getting webhook status:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting webhook status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=webhook.js.map