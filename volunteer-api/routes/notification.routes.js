const router = require('express').Router();
const notificationController = require('../controllers/notification.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/', verifyToken, notificationController.getUserNotifications);
router.post('/activity', notificationController.createActivityNotification); 
router.put('/:id/read', verifyToken, notificationController.markAsRead);
router.put('/read-all', verifyToken, notificationController.markAllAsRead);
router.delete('/:id', verifyToken, notificationController.deleteNotification);

module.exports = router;