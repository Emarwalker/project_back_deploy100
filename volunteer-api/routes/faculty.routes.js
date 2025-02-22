const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/faculty.controller');

// ดึงข้อมูลคณะทั้งหมด
router.get('/', facultyController.getAllFaculties);

// ดึงสถิติการกู้ยืมแยกตามสาขา - ต้องวางก่อน route ที่มี parameter
router.get('/majors/loan-stats', facultyController.getLoanStatsByMajor);

// ดึงข้อมูลสาขาในคณะที่เลือก
router.get('/:facultyId/majors', facultyController.getMajorsByFaculty);

module.exports = router;