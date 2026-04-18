require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { startHoldExpiryJob } = require('./jobs/holdExpiryJob');

// ─── Route imports ────────────────────────────────────────────────────────────
const authRoutes      = require('./routes/auth.routes');
const hotelRoutes     = require('./routes/hotel.routes');
const bookingRoutes   = require('./routes/booking.routes');
const cityRoutes      = require('./routes/city.routes');
const dealsRoutes     = require('./routes/deals.routes');
const newsletterRoutes = require('./routes/newsletter.routes');
const paymentRoutes   = require('./routes/payment.routes');
const roomTypeRoutes  = require('./routes/roomType.routes');
const adminRoutes     = require('./routes/admin.routes');

const app = express();

// ─── Trust proxy (required on Render / Heroku / any reverse proxy) ────────────
// Fixes: ERR_ERL_UNEXPECTED_X_FORWARDED_FOR from express-rate-limit
app.set('trust proxy', 1);

// ─── Database ─────────────────────────────────────────────────────────────────
connectDB();

// ─── CORS ─────────────────────────────────────────────────────────────────────
// CLIENT_URL can be a comma-separated list, e.g.:
//   http://localhost:5173,https://yoyo-hotel.vercel.app
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (curl, Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Yoyo-Hotel-Booking API', timestamp: new Date() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const API_VERSION = '/api';

app.use(`${API_VERSION}/auth`,       authRoutes);
app.use(`${API_VERSION}/hotels`,     hotelRoutes);
app.use(`${API_VERSION}/bookings`,   bookingRoutes);
app.use(`${API_VERSION}/payments`,   paymentRoutes);
app.use(`${API_VERSION}/room-types`, roomTypeRoutes);
app.use(`${API_VERSION}/cities`,     cityRoutes);
app.use(`${API_VERSION}/deals`,      dealsRoutes);
app.use(`${API_VERSION}/newsletter`, newsletterRoutes);
app.use(`${API_VERSION}/admin`,      adminRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Background Jobs ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  startHoldExpiryJob();
}

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Yoyo Hotel Booking API running on port ${PORT} [${process.env.NODE_ENV}]`);
  console.log(`📋 API Endpoints:`);
  console.log(`   Auth:       ${API_VERSION}/auth`);
  console.log(`   Hotels:     ${API_VERSION}/hotels`);
  console.log(`   Bookings:   ${API_VERSION}/bookings`);
  console.log(`   Payments:   ${API_VERSION}/payments`);
  console.log(`   Room Types: ${API_VERSION}/room-types`);
  console.log(`   Cities:     ${API_VERSION}/cities`);
  console.log(`   Deals:      ${API_VERSION}/deals`);
  console.log(`   Newsletter: ${API_VERSION}/newsletter`);
  console.log(`   Admin:      ${API_VERSION}/admin`);
});

// Graceful shutdown
process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

module.exports = app; // for testing
