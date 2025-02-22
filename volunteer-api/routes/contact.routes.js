// routes/contact.routes.js
const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// เหลือแค่ route เดียวสำหรับการส่งอีเมล
router.post('/contact', verifyToken, contactController.sendContactEmail);

module.exports = router;