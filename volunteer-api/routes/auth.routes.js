const express = require('express');
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  verifyOTP,
  logout,
  loginLimiter,
  checkExisting 
} = require('../controllers/auth.controller');

const { validateRegistration } = require('../middleware/validation.middleware');

router.post('/register', validateRegistration, register);
router.post('/check-existing', checkExisting); 
router.post('/login', loginLimiter, login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/logout', logout);

module.exports = router;