const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
 getUserProfile,
 updateUserProfile,
 getAllUsers, 
 getUserStats,
 deleteUser,
 updateUserRole,
 getLoanStats,
 updateTotalHours 
} = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validateProfileUpdate } = require('../middleware/validation.middleware');

// Rate limiting configuration
const limiter = rateLimit({
 windowMs: 15 * 60 * 1000, // 15 minutes
 max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiter to all routes
router.use(limiter);

// User profile routes
router.get('/profile', verifyToken, getUserProfile);
router.put('/profile', [verifyToken, validateProfileUpdate], updateUserProfile);

// User management routes
router.get('/all', verifyToken, getAllUsers);
router.get('/stats', verifyToken, getUserStats);
router.delete('/:id', verifyToken, deleteUser);
router.put('/:id/role', verifyToken, updateUserRole);

// สถิติการกู้ยืม
router.get('/loan-stats', verifyToken, getLoanStats);

// อัพเดทจำนวนชั่วโมง
router.patch('/total-hours', verifyToken, updateTotalHours);

module.exports = router;