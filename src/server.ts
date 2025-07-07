// Load environment variables first before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
// Rate limiting completely removed from dependencies
import dbConnect from './config/database';

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
console.log('🔍 Webhook routes imported:', typeof webhookRoutes, webhookRoutes);

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware (temporarily disabled to debug)
// app.use(helmet({
//   crossOriginResourcePolicy: { policy: "cross-origin" }
// }));

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

// Connect to database
dbConnect();

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
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/check-in', checkInRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);

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