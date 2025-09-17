import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import SuggestionPackage from '../models/SuggestionPackage';

// Get all suggestion packages with pagination and filters
export const getAllSuggestionPackages = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      isActive = '',
      sortBy = 'sortOrder',
      sortOrder = 'asc'
    } = req.query;

    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const packages = await SuggestionPackage.find(query)
      .populate('createdBy', 'name email')
      .sort(sortOptions)
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));

    const total = await SuggestionPackage.countDocuments(query);

    res.json({
      success: true,
      data: packages,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error getting suggestion packages:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get single suggestion package
export const getSuggestionPackageById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const pkg = await SuggestionPackage.findById(id).populate('createdBy', 'name email');
    
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Suggestion package not found' });
    }

    res.json({ success: true, data: pkg });
  } catch (error) {
    console.error('Error getting suggestion package:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Create new suggestion package
export const createSuggestionPackage = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      price,
      suggestionCount,
      isActive = true,
      isFeatured = false,
      sortOrder = 0,
      validityDays = 365
    } = req.body;

    const pkg = new SuggestionPackage({
      name,
      description,
      price,
      suggestionCount,
      isActive,
      isFeatured,
      sortOrder,
      validityDays,
      createdBy: req.user?.id
    });

    await pkg.save();

    res.status(201).json({ success: true, data: pkg });
  } catch (error) {
    console.error('Error creating suggestion package:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update suggestion package
export const updateSuggestionPackage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const pkg = await SuggestionPackage.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Suggestion package not found' });
    }

    res.json({ success: true, data: pkg });
  } catch (error) {
    console.error('Error updating suggestion package:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Delete suggestion package
export const deleteSuggestionPackage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const pkg = await SuggestionPackage.findByIdAndDelete(id);

    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Suggestion package not found' });
    }

    res.json({ success: true, message: 'Suggestion package deleted successfully' });
  } catch (error) {
    console.error('Error deleting suggestion package:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Toggle suggestion package status
export const toggleSuggestionPackageStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const pkg = await SuggestionPackage.findById(id);

    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Suggestion package not found' });
    }

    pkg.isActive = !pkg.isActive;
    await pkg.save();

    res.json({ 
      success: true, 
      data: pkg,
      message: `Suggestion package ${pkg.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling suggestion package status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update sort order
export const updateSortOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { packages } = req.body; // Array of { id, sortOrder }

    const updatePromises = packages.map((pkg: any) =>
      SuggestionPackage.findByIdAndUpdate(pkg.id, { sortOrder: pkg.sortOrder })
    );

    await Promise.all(updatePromises);

    res.json({ 
      success: true, 
      message: 'Sort order updated successfully' 
    });
  } catch (error) {
    console.error('Error updating sort order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get suggestion package statistics
export const getSuggestionPackageStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30' } = req.query; // days
    const days = Number(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await SuggestionPackage.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPackages: { $sum: 1 },
          activePackages: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          totalPurchases: { $sum: '$purchaseCount' },
          totalRevenue: { $sum: '$totalRevenue' }
        }
      }
    ]);

    const popularPackages = await SuggestionPackage.find({ isActive: true })
      .sort({ purchaseCount: -1 })
      .limit(5)
      .select('name purchaseCount totalRevenue');

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalPackages: 0,
          activePackages: 0,
          totalPurchases: 0,
          totalRevenue: 0
        },
        popularPackages
      }
    });
  } catch (error) {
    console.error('Error getting suggestion package statistics:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
