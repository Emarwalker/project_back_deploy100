const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const http = require('http');
require('dotenv').config();

// Imports
const sequelize = require('./config/database');

// Import models and associations
const { Activity, ActivityCategory } = require('./models/associations');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const facultyRoutes = require('./routes/faculty.routes');
const fileRoutes = require('./routes/file.routes');
const categoryRoutes = require('./routes/category.routes');
const activityRoutes = require('./routes/activity.routes');
const profileRoutes = require('./routes/profile.routes');
const planactivityRoutes = require('./routes/planctivity.routes');
const notificationRoutes = require('./routes/notification.routes');
const contactRoutes = require('./routes/contact.routes');

const app = express();
const server = http.createServer(app);

const COOKIE_SECRET = process.env.COOKIE_SECRET || 'your-secret-key-123';
app.use(cookieParser(COOKIE_SECRET));

// Import and initialize socket.io
const { initSocket } = require('./config/socket');
initSocket(server);

// Security Middleware
app.use(helmet({
 contentSecurityPolicy: {
   directives: {
     defaultSrc: ["'self'"],
     scriptSrc: ["'self'", "'unsafe-inline'"],
     styleSrc: ["'self'", "'unsafe-inline'"],
     imgSrc: ["'self'", "data:", "https:"],
   },
 },
 crossOriginEmbedderPolicy: false,
 crossOriginResourcePolicy: false 
}));
app.use(xss());
app.use(hpp());
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
 windowMs: 100 * 60 * 1000,
 max: 1200,
 message: {
   success: false,
   message: 'คำขอมากเกินไป กรุณาลองใหม่ในภายหลัง'
 }
});
app.use('/api/', limiter);

// CORS
app.use(cors({
 origin: process.env.CLIENT_URL || "http://localhost:5173",
 methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
 allowedHeaders: ['Content-Type', 'Authorization'],
 credentials: true,
 maxAge: 600
}));

// Body parser
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Initialize models and associations
require('./models/associations');
require('./models/associationsfile');

// Static folders
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploadsfile', express.static(path.join(__dirname, 'uploadsfile')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/', fileRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api', activityRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/', planactivityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/', contactRoutes);

// ตั้งค่าโฟลเดอร์สำหรับไฟล์
const setupUploadDirectories = () => {
 ['uploads', 'uploadsfile'].forEach(dir => {
   const dirPath = path.join(__dirname, dir);
   if (!fs.existsSync(dirPath)) {
     fs.mkdirSync(dirPath, { recursive: true, mode: '0755' });
   }
 });
};

// Error handling middleware
app.use((err, req, res, next) => {
 console.error('Error:', err.message);
 console.error('Stack:', err.stack);

 if (err.name === 'SequelizeValidationError') {
   return res.status(400).json({
     success: false,
     message: 'ข้อมูลไม่ถูกต้อง',
     errors: err.errors.map(e => e.message)
   });
 }

 if (err.name === 'SequelizeUniqueConstraintError') {
   return res.status(400).json({
     success: false,
     message: 'ข้อมูลซ้ำในระบบ',
     errors: err.errors.map(e => e.message)
   });
 }

 if (err.name === 'JsonWebTokenError') {
   return res.status(401).json({
     success: false,
     message: 'Token ไม่ถูกต้อง'
   });
 }

 res.status(err.status || 500).json({
   success: false,
   message: err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
 });
});

// 404 Handler
app.use((req, res) => {
 res.status(404).json({
   success: false,
   message: 'ไม่พบ API ที่ร้องขอ'
 });
});

const PORT = process.env.PORT || 5001;

async function startServer() {
 try {
   await sequelize.authenticate();
   console.log('เชื่อมต่อฐานข้อมูลสำเร็จ');
   
   await sequelize.sync();
   console.log('ซิงค์ฐานข้อมูลสำเร็จ');
   
   setupUploadDirectories();
   
   server.listen(PORT, () => { // Changed from app.listen to server.listen
     console.log(`เซิร์ฟเวอร์ทำงานที่พอร์ต ${PORT}`);
     console.log(`API URL: http://localhost:${PORT}/api`);
   });
 } catch (error) {
   console.error('ไม่สามารถเชื่อมต่อฐานข้อมูล:', error);
   process.exit(1);
 }
}

// Global error handlers
process.on('unhandledRejection', (err) => {
 console.error('Unhandled Promise Rejection:', err);
 process.exit(1);
});

process.on('uncaughtException', (err) => {
 console.error('Uncaught Exception:', err);
 process.exit(1);
});

startServer();