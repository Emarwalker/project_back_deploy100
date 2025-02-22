const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth.middleware');
const {
  createPlanActivity,
  getAllPlanActivities,
  updatePlanActivity,
  deletePlanActivity,
  getPlanActivityById
} = require('../controllers/planactivity.controller');

router.post('/plan-activities', verifyToken, verifyAdmin, createPlanActivity);
router.get('/plan-activities', getAllPlanActivities);
router.put('/plan-activities/:id', verifyToken, verifyAdmin, updatePlanActivity);
router.delete('/plan-activities/:id', verifyToken, verifyAdmin, deletePlanActivity);
router.get('/plan-activities/plan/:planId', getPlanActivityById);

module.exports = router;