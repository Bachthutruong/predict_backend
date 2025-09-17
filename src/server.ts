// Load environment variables first before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
// Rate limiting completely removed from dependencies
import dbConnect from './config/database';
import { initializeDefaultSystemSettings } from './models/system-settings';
import { createIndexes } from './utils/seed';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import predictionRoutes from './routes/prediction';
import adminRoutes from './routes/admin';
import staffRoutes from './routes/staff';
import checkInRoutes from './routes/check-in';
import feedbackRoutes from './routes/feedback';
import dashboardRoutes from './routes/dashboard';
import cloudinaryRoutes from './routes/cloudinary';
import webhookRoutes from './routes/webhook';
import surveyRoutes from './routes/survey'; // Import survey routes
import votingRoutes from './routes/voting'; // Import voting routes
import contestRoutes from './routes/contest'; // Import contest routes
import adminContestRoutes from './routes/adminContest'; // Import admin contest routes
import adminProductRoutes from './routes/adminProduct'; // Import admin product routes
import adminOrderRoutes from './routes/adminOrder'; // Import admin order routes
import adminSystemOrderRoutes from './routes/adminSystemOrder'; // New system order routes
import adminCouponRoutes from './routes/adminCoupon'; // Import admin coupon routes
import settingsRoutes from './routes/settings';
import adminSuggestionPackageRoutes from './routes/adminSuggestionPackage'; // Import admin suggestion package routes
import adminCategoryRoutes from './routes/adminCategory'; // Import admin category routes
import shopRoutes from './routes/shop'; // Import shop routes
import cartRoutes from './routes/cart'; // Import cart routes
import orderRoutes from './routes/order'; // Import order routes
console.log('🔍 Webhook routes imported:', typeof webhookRoutes, webhookRoutes);

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Trust proxy for rate limiting (needed for Render, Heroku, etc.)
// app.set('trust proxy', 1); // TEMPORARILY DISABLED while debugging

// CORS configuration
const allowedOrigins = [
  'https://predict-frontend-six.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

// Add environment variable origin if it exists
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Separate CORS for webhooks - this will be applied when webhook routes are registered

app.use(cors({
  origin: function (origin, callback) {
    console.log(`🌐 CORS check for origin: ${origin || 'none'}`);
    
    // Always allow requests with no origin (webhooks, curl, etc)
    if (!origin) {
      console.log(`✅ Allowing request with no origin`);
      return callback(null, true);
    }
    
    // Allow all webhook requests (WordPress/WooCommerce)
    if (origin && (origin.includes('wp-admin') || origin.includes('wordpress'))) {
      console.log(`✅ Allowing WordPress origin: ${origin}`);
      return callback(null, true);
    }
    
    // Remove trailing slash from origin for comparison
    const cleanOrigin = origin.replace(/\/$/, '');
    
    // Check if the origin is in the allowed list
    const isAllowed = allowedOrigins.some(allowedOrigin => 
      allowedOrigin.replace(/\/$/, '') === cleanOrigin
    );
    
    if (isAllowed) {
      console.log(`✅ Allowing known origin: ${origin}`);
      return callback(null, true);
    }
    
    // For debugging: allow all origins temporarily
    console.log(`⚠️ Unknown origin - allowing anyway for debug: ${origin}`);
    return callback(null, true); // TEMPORARY: Allow all origins
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-WC-Webhook-Signature', 'X-WC-Webhook-Source', 'X-WC-Webhook-Topic', 'X-WC-Webhook-Resource', 'X-WC-Webhook-Event']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Special middleware for webhooks to handle both JSON and form data
app.use('/api/webhook', (req, res, next) => {
  console.log('🔍 Webhook Body Parser:', {
    contentType: req.headers['content-type'],
    bodyType: typeof req.body,
    bodyKeys: Object.keys(req.body || {}),
    rawBody: req.body
  });
  
  // If it's form data, try to parse it
  if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
    console.log('📝 Form data detected, body:', req.body);
  }
  
  next();
});

// Connect to database
dbConnect()
  .then(() => {
    console.log('✅ Database connected successfully');
    // Create indexes for better performance
    return createIndexes();
  })
  .then(() => {
    // Initialize default settings after DB connected
    return initializeDefaultSystemSettings();
  })
  .then(() => {
    console.log('✅ Server setup completed');
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });

// Global debug middleware
app.use('*', (req, res, next) => {
  console.log(`🔍 ${req.method} ${req.path} from ${req.ip} - Origin: ${req.headers.origin || 'none'}`);
  if (req.path.includes('webhook')) {
    console.log(`🎯 WEBHOOK REQUEST DETECTED: ${req.method} ${req.path}`);
    console.log(`📋 Headers:`, req.headers);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'PredictWin API is running!',
    timestamp: new Date().toISOString()
  });
});

// TEMPORARY: Direct webhook test endpoint in server.ts
app.all('/api/webhook/direct-test', (req, res) => {
  console.log('🔥 DIRECT WEBHOOK TEST HIT');
  res.json({
    success: true,
    message: 'Direct webhook test working',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path
  });
});

// TEMPORARY: Simple test endpoint without webhook prefix
app.all('/api/simple-test', (req, res) => {
  console.log('🔥 SIMPLE API TEST HIT');
  res.json({
    success: true,
    message: 'Simple API test working',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path
  });
});

// ⚠️ CRITICAL: Webhook routes FIRST with CORS but NO rate limiting
console.log('🔧 Setting up WEBHOOK routes with CORS but NO rate limiting...');
app.use('/api/webhook', 
  cors({
    origin: true, // Allow all origins for webhooks
    credentials: false, // No credentials needed for webhooks
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: '*', // Allow all headers for webhooks
    preflightContinue: false,
    optionsSuccessStatus: 200
  }), 
  webhookRoutes
);

// Rate limiting completely removed from project

console.log('🔧 Setting up API routes WITHOUT rate limiting (permanently removed)...');

// API routes WITHOUT rate limiting (temporarily disabled)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/contests', contestRoutes); // Use contest routes
// Specific admin sub-routers MUST be mounted before generic '/api/admin' to avoid route conflicts
app.use('/api/admin/contests', adminContestRoutes); // Use admin contest routes
app.use('/api/admin/products', adminProductRoutes); // Use admin product routes
// Preserve legacy WooCommerce admin orders under /api/admin/orders (unchanged)
app.use('/api/admin/orders', adminOrderRoutes);
// New: System orders under a separate namespace to avoid confusion with Woo
app.use('/api/admin/system-orders', adminSystemOrderRoutes);
app.use('/api/admin/coupons', adminCouponRoutes); // Use admin coupon routes
app.use('/api/admin/suggestion-packages', adminSuggestionPackageRoutes); // Use admin suggestion package routes
app.use('/api/admin/categories', adminCategoryRoutes); // Use admin category routes
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/check-in', checkInRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);
app.use('/api/surveys', surveyRoutes); // Use survey routes
app.use('/api/voting', votingRoutes); // Use voting routes
app.use('/api/shop', shopRoutes); // Use shop routes
app.use('/api/cart', cartRoutes); // Use cart routes
app.use('/api/orders', orderRoutes); // Use order routes
app.use('/api/settings', settingsRoutes); // Settings routes (public + admin)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found' 
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📋 API documentation: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}); 