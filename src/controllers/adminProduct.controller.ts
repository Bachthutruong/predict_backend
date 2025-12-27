import { Response } from 'express';
import Product from '../models/Product';
import InventoryLog from '../models/InventoryLog';
import { AuthRequest } from '../middleware/auth';

// Get all products with pagination and filters
export const getAllProducts = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      isActive = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: any = {};

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

    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .populate('createdBy', 'name email')
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
    console.error('Error getting products:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get single product
export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate('createdBy', 'name email');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Create new product
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      price,
      originalPrice,
      images = [],
      category,
      brand,
      sku,
      stock,
      isActive = true,
      isFeatured = false,
      weight,
      dimensions,
      pointsReward = 0,
      pointsRequired = 0,
      canPurchaseWithPoints = false,
      metaTitle,
      metaDescription,
      tags = [],
      variants = [],
      freeShipping = false,
      shippingWeight = 0
    } = req.body;

    const product = new Product({
      name,
      description,
      price,
      originalPrice,
      images: images as string[],
      category,
      brand,
      sku,
      stock,
      isActive,
      isFeatured,
      weight,
      dimensions,
      pointsReward,
      pointsRequired,
      canPurchaseWithPoints,
      metaTitle,
      metaDescription,
      tags,
      variants,
      freeShipping,
      shippingWeight,
      createdBy: req.user?.id
    });

    await product.save();

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update product
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Only allow updating safe, whitelisted fields
    const allowedFields = [
      'name',
      'description',
      'price',
      'originalPrice',
      'images',
      'category',
      'brand',
      'sku',
      'stock',
      'isActive',
      'isFeatured',
      'weight',
      'dimensions',
      'pointsReward',
      'pointsRequired',
      'canPurchaseWithPoints',
      'metaTitle',
      'metaDescription',
      'tags',
      'variants',
      'freeShipping',
      'shippingWeight'
    ];

    const updateData: any = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updateData[key] = (req.body as any)[key];
      }
    }

    // Explicitly block fields that should never be overwritten from client payload
    delete (updateData as any)._id;
    delete (updateData as any).id;
    delete (updateData as any).createdBy;
    delete (updateData as any).createdAt;
    delete (updateData as any).updatedAt;

    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Delete product
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Toggle product status
export const toggleProductStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.json({
      success: true,
      data: product,
      message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling product status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get product categories
export const getProductCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update product stock
export const updateProductStock = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { stock, operation = 'set', reason = '', note = '' } = req.body; // operation: 'set', 'add', 'subtract'

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const previousStock = product.stock;
    let changeAmount = 0;

    switch (operation) {
      case 'add':
        product.stock += stock;
        changeAmount = stock;
        break;
      case 'subtract':
        changeAmount = -stock;
        product.stock = Math.max(0, product.stock - stock);
        break;
      case 'set':
      default:
        changeAmount = stock - previousStock;
        product.stock = stock;
        break;
    }

    await product.save();

    // Log inventory change
    try {
      if (changeAmount !== 0) {
        await InventoryLog.create({
          product: product._id,
          changeAmount,
          previousStock,
          newStock: product.stock,
          type: operation === 'add' ? 'import' : (operation === 'subtract' ? 'export' : 'adjustment'),
          reason: reason || 'Manual update',
          note,
          performedBy: req.user?.id
        });
      }
    } catch (logError) {
      console.error('Failed to log inventory change:', logError);
    }

    res.json({
      success: true,
      data: product,
      message: 'Stock updated successfully'
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get product inventory history
export const getInventoryHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const history = await InventoryLog.find({ product: id })
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await InventoryLog.countDocuments({ product: id });

    res.json({
      success: true,
      data: history,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error getting inventory history:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
