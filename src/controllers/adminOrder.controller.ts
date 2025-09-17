import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Order from '../models/order';
import User from '../models/user';
import Product from '../models/Product';

// Get all orders with pagination and filters
export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = '',
      paymentStatus = '',
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: any = {};
    
    if (status) {
      query.status = status;
    }
    
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.name': { $regex: search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images price')
      .populate('coupon', 'code name discountType discountValue')
      .sort(sortOptions)
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get single order
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate('user', 'name email phone address')
      .populate('items.product', 'name images price pointsReward')
      .populate('coupon', 'code name discountType discountValue')
      .populate('cancelledBy', 'name email');
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update order status
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = [
      'pending', 'waiting_payment', 'waiting_confirmation', 
      'processing', 'shipped', 'delivered', 'completed', 'cancelled'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status' 
      });
    }

    const order = await Order.findById(id).populate('user', 'points');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const oldStatus = order.status;
    order.status = status;
    
    if (adminNotes) {
      order.adminNotes = adminNotes;
    }

    // Handle status-specific logic
    if (status === 'shipped') {
      order.shippedAt = new Date();
    } else if (status === 'delivered') {
      order.deliveredAt = new Date();
    } else if (status === 'completed') {
      // Add points to user when order is completed
      if (order.user && typeof order.user.points === 'number') {
        const user = await User.findById(order.user._id);
        if (user) {
          user.points += order.pointsEarned;
          await user.save();
        }
      }
    } else if (status === 'cancelled') {
      order.cancelledAt = new Date();
      order.cancelledBy = req.user?.id;
      
      // Refund points used (add back to user) if not already refunded
      if (!order.pointsRefunded && order.user && typeof order.user.points === 'number') {
        const user = await User.findById(order.user._id);
        if (user) {
          user.points += order.pointsUsed;
          await user.save();
          order.pointsRefunded = true;
        }
      }
    }

    await order.save();

    res.json({ 
      success: true, 
      data: order,
      message: `Order status updated from ${oldStatus} to ${status}`
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update payment status
export const updatePaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    const validStatuses = ['pending', 'waiting_confirmation', 'paid', 'failed', 'refunded'];

    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment status' 
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.paymentStatus = paymentStatus;
    
    // Update order status based on payment status
    if (paymentStatus === 'paid') {
      if (order.status === 'waiting_payment') {
        order.status = 'processing';
      }
    }

    await order.save();

    res.json({ 
      success: true, 
      data: order,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Add tracking number
export const addTrackingNumber = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { trackingNumber } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.trackingNumber = trackingNumber;
    order.status = 'shipped';
    order.shippedAt = new Date();

    await order.save();

    res.json({ 
      success: true, 
      data: order,
      message: 'Tracking number added successfully'
    });
  } catch (error) {
    console.error('Error adding tracking number:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get order statistics
export const getOrderStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30' } = req.query; // days
    const days = Number(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    const statusBreakdown = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const paymentStatusBreakdown = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          pendingOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0
        },
        statusBreakdown,
        paymentStatusBreakdown
      }
    });
  } catch (error) {
    console.error('Error getting order statistics:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Cancel order
export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id).populate('user', 'points');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['pending', 'waiting_payment', 'waiting_confirmation'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order cannot be cancelled at this stage' 
      });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelledBy = req.user?.id;
    order.cancellationReason = reason || 'Cancelled by admin';

    // Refund points if any were used
    if (order.pointsUsed > 0 && order.user && typeof order.user.points === 'number') {
      const user = await User.findById(order.user._id);
      if (user) {
        user.points = Math.max(0, user.points - order.pointsUsed);
        await user.save();
        order.pointsRefunded = true;
      }
    }

    await order.save();

    res.json({ 
      success: true, 
      data: order,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
