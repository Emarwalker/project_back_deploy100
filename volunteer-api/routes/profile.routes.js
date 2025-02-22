const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { verifyToken, verifyRoles } = require('../middleware/auth.middleware');


router.use(verifyToken);

router.get('/activities', profileController.getRegisteredActivities);
router.post('/activities/register', profileController.registerActivities);
router.patch('/activities/:activityId/status', profileController.updateActivityStatus);
router.delete('/activities/:activityId', profileController.deleteActivity);


module.exports = router;