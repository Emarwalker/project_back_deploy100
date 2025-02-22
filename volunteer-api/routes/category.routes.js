const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { verifyToken, verifyAdmin, verifyRoles } = require('../middleware/auth.middleware');


router.get('/categories', verifyToken, categoryController.getAllCategories);
router.post('/categories', verifyToken, verifyAdmin, categoryController.createCategory);
router.put('/categories/:id', verifyToken, verifyAdmin, categoryController.updateCategory);
router.delete('/categories/:id', verifyToken, verifyAdmin, categoryController.deleteCategory);

module.exports = router;