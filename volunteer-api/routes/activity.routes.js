const express = require('express');
const router = express.Router();
const multer = require('multer');
const activityController = require('../controllers/activity.controller');
const { verifyToken, verifyAdmin } = require('../middleware/auth.middleware');

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
});

const upload = multer({ storage: storage });

// Route สำหรับตรวจสอบจำนวนครั้งที่ user ทำกิจกรรม (ใส่ไว้ก่อน route ที่มี parameter)
router.get('/activities/check/:activityId',
  verifyToken,
  activityController.checkUserAttempts
);

// ดึง top 5 activities (ย้ายขึ้นมาก่อน route ที่มี parameter)
router.get('/activities/top-activities',
  verifyToken,
  activityController.getTopActivities
);

// สร้างกิจกรรมใหม่
router.post('/activities',
  verifyToken,
  verifyAdmin,
  upload.single('image'),
  activityController.createActivity
);

// ดึงรายการกิจกรรมทั้งหมด
router.get('/activities',
  activityController.getAllActivities
);

// แก้ไขกิจกรรม
router.put('/activities/:id',
  verifyToken,
  verifyAdmin,
  upload.single('image'),
  activityController.updateActivity
);

// ลบกิจกรรม
router.delete('/activities/:id',
  verifyToken,
  verifyAdmin,
  activityController.deleteActivity
);

// ดึงข้อมูลสถิติของกิจกรรมเฉพาะ
router.get('/activities/:id/stats',
  verifyToken,
  activityController.getActivityStats
);

// ดึงข้อมูล dashboard
router.get('/dashboard-stats',
  verifyToken,
  activityController.getDashboardStats
);

router.get('/activities/available/:userId',
  verifyToken,
  activityController.getAvailableActivities
);

module.exports = router;