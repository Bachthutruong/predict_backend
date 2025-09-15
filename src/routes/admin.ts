import express from 'express';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import { checkPredictionAuthor, checkPredictionViewAccess } from '../middleware/predictionAuth';
import Prediction from '../models/prediction';
import User from '../models/user';
import Feedback from '../models/feedback';
import Question from '../models/question';
import PointTransaction from '../models/point-transaction';
import UserPrediction from '../models/user-prediction';
import Order from '../models/order';
import { encrypt } from '../utils/encryption';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Admin Dashboard Stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalPredictions,
      activePredictions,
      totalPoints,
      pendingFeedback,
      totalStaff,
      thisMonthUsers,
      thisMonthPredictions
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Prediction.countDocuments(),
      Prediction.countDocuments({ status: 'active' }),
      User.aggregate([
        { $match: { role: 'user' } },
        { $group: { _id: null, total: { $sum: '$points' } } }
      ]).then(result => result[0]?.total || 0),
      Feedback.countDocuments({ status: 'pending' }),
      User.countDocuments({ role: 'staff' }),
      User.countDocuments({
        role: 'user',
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }),
      Prediction.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      })
    ]);

    const recentPredictions = await Prediction.find()
      .populate('authorId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalPredictions,
        activePredictions,
        totalPoints,
        pendingFeedback,
        totalStaff,
        thisMonthUsers,
        thisMonthPredictions,
        recentPredictions
      }
    });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create prediction
router.post('/predictions', async (req: AuthRequest, res) => {
  try {
    const { title, description, imageUrl, correctAnswer } = req.body;
    // Coerce numeric fields from body (can arrive as strings)
    const pointsCost = Number(req.body.pointsCost);
    const rewardPointsInput = req.body.rewardPoints;
    const rewardPoints = Number(rewardPointsInput);

    // Encrypt the answer before storing
    const encryptedAnswer = encrypt(correctAnswer);

    const prediction = new Prediction({
      title,
      description,
      imageUrl,
      answer: encryptedAnswer,
      pointsCost: isNaN(pointsCost) ? 0 : pointsCost,
      rewardPoints: !isNaN(rewardPoints) && rewardPoints > 0
        ? rewardPoints
        : Math.round((isNaN(pointsCost) ? 0 : pointsCost) * 1.5),
      authorId: req.user!.id
    });

    await prediction.save();

    // Transform the data to match frontend expectations
    // Only show decrypted answer to the author
    const transformedPrediction = {
      ...prediction.toObject(),
      id: prediction._id.toString(), // Ensure ID is properly set
      // For admin (author) who just created, return decrypted answer in both fields
      answer: prediction.getDecryptedAnswer(),
      correctAnswer: prediction.getDecryptedAnswer(),
      rewardPoints: prediction.rewardPoints
    };

    res.status(201).json({
      success: true,
      data: transformedPrediction,
      message: 'Prediction created successfully'
    });
  } catch (error) {
    console.error('Create prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all predictions with stats
router.get('/predictions', async (req: AuthRequest, res) => {
  try {
    const predictions = await Prediction.find()
      .populate('authorId', 'name')
      .populate('winnerId', 'name avatarUrl')
      .sort({ createdAt: -1 });

    // Get stats for each prediction
    const predictionsWithStats = await Promise.all(
      predictions.map(async (prediction) => {
        const userPredictions = await UserPrediction.find({ predictionId: prediction._id });
        const totalParticipants = userPredictions.length;
        const totalPoints = userPredictions.reduce((sum, up) => sum + up.pointsSpent, 0);
        const averagePoints = totalParticipants > 0 ? Math.round(totalPoints / totalParticipants) : 0;

        const obj = prediction.toObject();
        const isAuthor = prediction.isAuthor(req.user!.id);
        
        return {
          ...obj,
          id: obj._id.toString(), // Ensure ID is properly set
          answer: isAuthor ? prediction.getDecryptedAnswer() : '***ENCRYPTED***',
          correctAnswer: isAuthor ? prediction.getDecryptedAnswer() : '***ENCRYPTED***',
          rewardPoints: prediction.rewardPoints,
          totalParticipants,
          totalPoints,
          averagePoints,
          isAuthor // Add flag to indicate if current user is author
        };
      })
    );

    res.json({
      success: true,
      data: predictionsWithStats
    });
  } catch (error) {
    console.error('Get all predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get prediction details with user predictions
router.get('/predictions/:id', checkPredictionViewAccess as any, async (req: any, res) => {
  try {
    const { id } = req.params;
    const prediction = req.prediction!;
    const canViewAnswer = req.canViewAnswer!;

    // Get user predictions for this prediction
    const userPredictions = await UserPrediction.find({ predictionId: id })
      .populate('userId', 'name avatarUrl')
      .sort({ createdAt: -1 });

    // Calculate stats
    const totalPredictions = userPredictions.length;
    const correctPredictions = userPredictions.filter(up => up.isCorrect).length;
    const totalPointsAwarded = userPredictions
      .filter(up => up.isCorrect)
      .reduce((sum, up) => sum + up.pointsSpent, 0);

    // Transform user predictions to match frontend expectations
    const transformedUserPredictions = userPredictions.map(up => {
      const obj = up.toObject();
      return {
        ...obj,
        id: obj._id.toString(), // Ensure ID is properly set
        user: obj.userId
      };
    });

    const predictionWithStats = {
      ...prediction.toObject(),
      id: prediction._id.toString(), // Ensure ID is properly set
      answer: canViewAnswer ? prediction.getDecryptedAnswer() : '***ENCRYPTED***',
      correctAnswer: canViewAnswer ? prediction.getDecryptedAnswer() : '***ENCRYPTED***',
      totalPredictions,
      correctPredictions,
      totalPointsAwarded,
      userPredictions: transformedUserPredictions
    };

    res.json({
      success: true,
      data: predictionWithStats
    });
  } catch (error) {
    console.error('Get prediction details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update prediction
router.put('/predictions/:id', checkPredictionAuthor as any, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { title, description, imageUrl, correctAnswer, status } = req.body;
    const pointsCost = Number(req.body.pointsCost);
    const rewardPointsBody = Number(req.body.rewardPoints);
    const prediction = req.prediction!;

    // Encrypt the answer before storing
    const encryptedAnswer = encrypt(correctAnswer);

    // Update prediction fields
    prediction.title = title;
    prediction.description = description;
    prediction.imageUrl = imageUrl;
    prediction.answer = encryptedAnswer;
    prediction.pointsCost = isNaN(pointsCost) ? prediction.pointsCost : pointsCost;
    prediction.rewardPoints = !isNaN(rewardPointsBody) && rewardPointsBody > 0
      ? rewardPointsBody
      : Math.round((isNaN(pointsCost) ? prediction.pointsCost : pointsCost) * 1.5);
    prediction.status = status;

    await prediction.save();

    // Transform the data to match frontend expectations
    // Only show decrypted answer to the author
    const transformedPrediction = {
      ...prediction.toObject(),
      id: prediction._id.toString(), // Ensure ID is properly set
      // For author, keep decrypted answer in both fields
      answer: prediction.getDecryptedAnswer(),
      correctAnswer: prediction.getDecryptedAnswer(),
      rewardPoints: prediction.rewardPoints
    };

    res.json({
      success: true,
      data: transformedPrediction,
      message: 'Prediction updated successfully'
    });
  } catch (error) {
    console.error('Update prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete prediction
router.delete('/predictions/:id', checkPredictionAuthor as any, async (req: any, res) => {
  try {
    const { id } = req.params;
    const prediction = req.prediction!;

    // Delete associated user predictions
    await UserPrediction.deleteMany({ predictionId: id });

    // Delete the prediction
    await Prediction.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Prediction deleted successfully'
    });
  } catch (error) {
    console.error('Delete prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update prediction status (only admin can close predictions)
router.put('/predictions/:id/status', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const prediction = await Prediction.findById(id);
    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    // Only allow admin to close predictions
    if (status === 'finished' && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can close predictions'
      });
    }

    prediction.status = status;
    await prediction.save();


    // Transform the data to match frontend expectations
    const transformedPrediction = {
      ...prediction.toObject(),
      id: prediction._id.toString(), // Ensure ID is properly set
      correctAnswer: prediction.isAuthor(req.user!.id) ? prediction.getDecryptedAnswer() : '***ENCRYPTED***'
    };

    res.json({
      success: true,
      data: transformedPrediction,
      message: `Prediction status updated to ${status}`
    });
  } catch (error) {
    console.error('Update prediction status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 });

    // Transform the data to match frontend expectations
    const transformedUsers = users.map(user => {
      const obj = user.toObject();
      return {
        ...obj,
        id: obj._id.toString() // Ensure ID is properly set
      };
    });

    res.json({
      success: true,
      data: transformedUsers
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Grant points to user
router.post('/grant-points', async (req: AuthRequest, res) => {
  try {
    const { userId, amount, notes } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.points += amount;
    await user.save();

    // Record the transaction
    await PointTransaction.create({
      userId: userId,
      adminId: req.user!.id,
      amount,
      reason: 'admin-grant',
      notes
    });

    res.json({
      success: true,
      message: `${amount} points granted to ${user.name}`
    });
  } catch (error) {
    console.error('Grant points error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all feedback for admin review
router.get('/feedback', async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate('userId', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    // Transform the data to match frontend expectations
    const transformedFeedback = feedback.map(item => {
      const obj = item.toObject();
      return {
        ...obj,
        id: obj._id.toString(), // Ensure ID is properly set
        user: obj.userId
      };
    });

    res.json({
      success: true,
      data: transformedFeedback
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Approve feedback and award points
router.patch('/feedback/:id/approve', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { points } = req.body;

    const feedback = await Feedback.findById(id).populate('userId');
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    if (feedback.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Feedback has already been processed'
      });
    }

    // Update feedback status
    feedback.status = 'approved';
    feedback.awardedPoints = points;
    await feedback.save();

    // Award points to user
    await User.findByIdAndUpdate(feedback.userId, {
      $inc: { points: points }
    });

    // Record transaction
    await PointTransaction.create({
      userId: feedback.userId,
      adminId: req.user!.id,
      amount: points,
      reason: 'feedback',
      notes: `Feedback approved: ${feedback.feedbackText.substring(0, 50)}...`
    });

    res.json({
      success: true,
      message: 'Feedback approved and points awarded'
    });
  } catch (error) {
    console.error('Approve feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Reject feedback
router.patch('/feedback/:id/reject', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    if (feedback.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Feedback has already been processed'
      });
    }

    feedback.status = 'rejected';
    await feedback.save();

    res.json({
      success: true,
      message: 'Feedback rejected'
    });
  } catch (error) {
    console.error('Reject feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all questions
router.get('/questions', async (req, res) => {
  try {
    const questions = await Question.find()
      .sort({ createdAt: -1 });

    // Transform the data to match frontend expectations
    const transformedQuestions = questions.map(question => {
      const obj = question.toObject();
      return {
        ...obj,
        id: obj._id.toString() // Ensure ID is properly set
      };
    });

    res.json({
      success: true,
      data: transformedQuestions
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create question
router.post('/questions', async (req: AuthRequest, res) => {
  try {
    const { questionText, imageUrl, answer, isPriority, points } = req.body;

    const question = new Question({
      questionText,
      imageUrl,
      answer,
      isPriority: isPriority || false,
      points: points || 10
    });

    await question.save();

    // Transform the data to match frontend expectations
    const transformedQuestion = {
      ...question.toObject(),
      id: question._id.toString() // Ensure ID is properly set
    };

    res.status(201).json({
      success: true,
      data: transformedQuestion,
      message: 'Question created successfully'
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update question
router.put('/questions/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const question = await Question.findByIdAndUpdate(id, updateData, { new: true });
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Transform the data to match frontend expectations
    const transformedQuestion = {
      ...question.toObject(),
      id: question._id.toString() // Ensure ID is properly set
    };

    res.json({
      success: true,
      data: transformedQuestion,
      message: 'Question updated successfully'
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get point transactions
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await PointTransaction.find()
      .populate('userId', 'name email')
      .populate('adminId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    // Transform the data to match frontend expectations
    const transformedTransactions = transactions.map(transaction => {
      const obj = transaction.toObject();
      return {
        ...obj,
        id: obj._id.toString(), // Ensure ID is properly set
        user: obj.userId,
        admin: obj.adminId
      };
    });

    res.json({
      success: true,
      data: transformedTransactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Staff Management
// Get all staff users
router.get('/staff', async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' })
      .sort({ createdAt: -1 });

    // Transform the data to match frontend expectations
    const transformedStaff = staff.map(user => {
      const obj = user.toObject();
      return {
        ...obj,
        id: obj._id.toString() // Ensure ID is properly set
      };
    });

    res.json({
      success: true,
      data: transformedStaff
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create staff account
router.post('/staff', async (req: AuthRequest, res) => {
  try {
    const { name, email, password, avatarUrl } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const staff = new User({
      name,
      email,
      password,
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=4169E1&textColor=ffffff`,
      role: 'staff',
      isEmailVerified: true // Staff accounts are pre-verified
    });

    await staff.save();

    // Transform the data to match frontend expectations
    const transformedStaff = {
      ...staff.toObject(),
      id: staff._id.toString() // Ensure ID is properly set
    };

    res.status(201).json({
      success: true,
      data: transformedStaff,
      message: 'Staff account created successfully'
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update staff account
router.put('/staff/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, avatarUrl } = req.body;

    const staff = await User.findById(id);
    if (!staff || staff.role !== 'staff') {
      return res.status(404).json({
        success: false,
        message: 'Staff account not found'
      });
    }

    // Check if email is being changed and already exists
    if (email !== staff.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    const updateData: any = {
      name,
      email,
      avatarUrl
    };

    if (password) {
      updateData.password = password;
    }

    const updatedStaff = await User.findByIdAndUpdate(id, updateData, { new: true });

    // Transform the data to match frontend expectations
    const transformedStaff = {
      ...updatedStaff.toObject(),
      id: updatedStaff._id.toString() // Ensure ID is properly set
    };

    res.json({
      success: true,
      data: transformedStaff,
      message: 'Staff account updated successfully'
    });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete staff account
router.delete('/staff/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const staff = await User.findById(id);
    if (!staff || staff.role !== 'staff') {
      return res.status(404).json({
        success: false,
        message: 'Staff account not found'
      });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Staff account deleted successfully'
    });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all orders
router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    
    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { customerEmail: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { wordpressOrderId: search }
      ];
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get order by ID
router.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get orders statistics
router.get('/orders/stats/overview', async (req, res) => {
  try {
    // Get all orders and group by status
    const allOrders = await Order.find({}, 'status total currency');
    
    // Initialize counters
    const stats = {
      totalOrders: 0,
      pendingOrders: 0,
      processingOrders: 0,
      completedOrders: 0,
      onHoldOrders: 0,
      cancelledOrders: 0,
      refundedOrders: 0,
      failedOrders: 0,
      ecpayOrders: 0,
      ecpayShippingOrders: 0,
      trashOrders: 0,
      totalRevenue: 0
    };

    // Process each order
    allOrders.forEach(order => {
      stats.totalOrders++;
      
      // Count by status
      switch (order.status) {
        case 'pending':
          stats.pendingOrders++;
          break;
        case 'processing':
          stats.processingOrders++;
          break;
        case 'completed':
          stats.completedOrders++;
          // Add to revenue only for completed orders
          stats.totalRevenue += parseFloat(order.total) || 0;
          break;
        case 'on-hold':
          stats.onHoldOrders++;
          break;
        case 'cancelled':
          stats.cancelledOrders++;
          break;
        case 'refunded':
          stats.refundedOrders++;
          break;
        case 'failed':
          stats.failedOrders++;
          break;
        case 'ecpay':
          stats.ecpayOrders++;
          break;
        case 'ecpay-shipping':
          stats.ecpayShippingOrders++;
          break;
        case 'trash':
          stats.trashOrders++;
          break;
        default:
          console.log(`Unknown order status: ${order.status}`);
      }
    });

    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('wordpressOrderId customerName customerEmail status total currency createdAt');

    // Get additional stats
    const additionalStats = await Promise.all([
      // Total customers (unique emails)
      Order.distinct('customerEmail').then(emails => emails.length),
      // Average order value
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, avg: { $avg: { $toDouble: '$total' } } } }
      ]).then(result => Math.round(result[0]?.avg || 0)),
      // Orders this month
      Order.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }),
      // Revenue this month
      Order.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        },
        { $group: { _id: null, total: { $sum: { $toDouble: '$total' } } } }
      ]).then(result => result[0]?.total || 0)
    ]);

    const [totalCustomers, averageOrderValue, ordersThisMonth, revenueThisMonth] = additionalStats;

    console.log('📊 Order Stats Calculated:', {
      totalOrders: stats.totalOrders,
      completed: stats.completedOrders,
      totalRevenue: stats.totalRevenue,
      totalCustomers,
      averageOrderValue
    });

    res.json({
      success: true,
      data: {
        stats: {
          ...stats,
          totalCustomers,
          averageOrderValue,
          ordersThisMonth,
          revenueThisMonth
        },
        recentOrders
      }
    });
  } catch (error) {
    console.error('Get orders stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update order status (for internal use)
router.patch('/orders/:id/status', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { 
        status,
        dateModified: new Date(),
        ...(notes && { processingError: notes })
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order,
      message: `Order status updated to ${status}`
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 