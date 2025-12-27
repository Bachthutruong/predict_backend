import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Product from '../models/Product';
import Category from '../models/Category';
import Coupon from '../models/Coupon';
import SuggestionPackage from '../models/SuggestionPackage';
import Branch from '../models/Branch';
import PaymentConfig from '../models/PaymentConfig';

// Get all products for shop (public)
export const getShopProducts = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
      category = '',
      minPrice = '',
      maxPrice = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: any = { isActive: true };

    if (search) {
      const searchStr = String(search);
      query.$or = [
        { name: { $regex: searchStr, $options: 'i' } },
        { description: { $regex: searchStr, $options: 'i' } },
        { tags: { $in: [new RegExp(searchStr, 'i')] } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .select('-createdBy -metaTitle -metaDescription')
      .sort(sortOptions)
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error getting shop products:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get single product for shop
export const getShopProductById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id, isActive: true })
      .select('-createdBy -metaTitle -metaDescription');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Need 'Review' model imported from somewhere if not already
    // Assuming assuming Review is exported from models/Review
    const Review = require('../models/Review').default;

    // Calculate rating stats
    const stats = await Review.aggregate([
      { $match: { product: product._id } },
      {
        $group: {
          _id: '$product',
          averageRating: { $avg: '$rating' },
          totalReviews: { $count: {} }
        }
      }
    ]);

    const reviewStats = stats.length > 0 ? stats[0] : { averageRating: 0, totalReviews: 0 };

    // Increment view count
    await Product.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    res.json({
      success: true,
      data: {
        ...product.toObject(),
        averageRating: reviewStats.averageRating,
        totalReviews: reviewStats.totalReviews
      }
    });
  } catch (error) {
    console.error('Error getting shop product:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get product categories
export const getProductCategories = async (req: AuthRequest, res: Response) => {
  try {
    // Prefer Category collection if exists
    const categoriesDocs = await Category.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).select('name');
    if (categoriesDocs.length > 0) {
      return res.json({ success: true, data: categoriesDocs.map(c => c.name) });
    }
    // Fallback to distinct from products
    const categories = await Product.distinct('category', { isActive: true });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get featured products
export const getFeaturedProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 8 } = req.query;

    const products = await Product.find({
      isActive: true,
      isFeatured: true
    })
      .select('-createdBy -metaTitle -metaDescription')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error getting featured products:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get suggestion packages for shop
export const getSuggestionPackages = async (req: AuthRequest, res: Response) => {
  try {
    const packages = await SuggestionPackage.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .select('-createdBy');

    res.json({ success: true, data: packages });
  } catch (error) {
    console.error('Error getting suggestion packages:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Validate coupon for shop
export const validateCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const { code, orderAmount, orderItems } = req.body;

    const coupon = await Coupon.findOne({ code });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    const isValid = coupon.isValid();
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is not valid or has expired'
      });
    }

    // For public validation, we don't check user-specific restrictions
    // This will be done again during checkout with user context

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (orderAmount * coupon.discountValue) / 100;
    } else if (coupon.discountType === 'fixed_amount') {
      discountAmount = Math.min(coupon.discountValue, orderAmount);
    } else if (coupon.discountType === 'free_shipping') {
      discountAmount = 0; // Will be handled separately
    }

    res.json({
      success: true,
      data: {
        coupon: {
          id: coupon._id,
          code: coupon.code,
          name: coupon.name,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue
        },
        discountAmount,
        isFreeShipping: coupon.discountType === 'free_shipping'
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Search products
export const searchProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const products = await Product.find({
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q as string, 'i')] } }
      ]
    })
      .select('name images price originalPrice category')
      .limit(Number(limit));

    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


// Get branches
export const getBranches = async (req: AuthRequest, res: Response) => {
  try {
    const branches = await Branch.find({ isActive: true });
    res.json({ success: true, data: branches });
  } catch (error) {
    console.error('Error getting branches:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get payment config
export const getPaymentConfig = async (req: AuthRequest, res: Response) => {
  try {
    const config = await PaymentConfig.findOne({ isActive: true });
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error getting payment config:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
