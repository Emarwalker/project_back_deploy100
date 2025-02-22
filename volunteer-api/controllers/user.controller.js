const { Op } = require('sequelize');
const sequelize = require('../config/database');
const User = require('../models/user.model');
const StudentDetails = require('../models/student_details.model.js');
const Faculty = require('../models/faculty.model');
const Major = require('../models/major.model');
const ActivityRegistration = require('../models/activity-registration.model');
const Activity = require('../models/activity.model');

const validateEmail = (email) => {
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return re.test(email);
};
 
const sanitizeInput = (input) => {
  return input ? input.trim() : null;
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id: req.userId, isActive: 1 },
      include: [{
        model: StudentDetails,
        include: [
          {
            model: Faculty,
            attributes: ['id', 'name']
          },
          {
            model: Major,
            attributes: ['id', 'name']
          }
        ]
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // สร้างเบอร์โทรในรูปแบบ xxx-xxx-1234 (ถ้าเบอร์เป็น 0891231234)
    const maskedPhoneNumber = `xxx-xxx-${user.lastThreeDigits}`;

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      phoneNumber: maskedPhoneNumber,  
      role: user.role,
      firstName: user.StudentDetail?.firstName ?? "",
      lastName: user.StudentDetail?.lastName ?? "",
      gender: user.StudentDetail?.gender ?? "",
      faculty_id: user.StudentDetail?.faculty_id ?? "",
      faculty_name: user.StudentDetail?.Faculty?.name ?? "",
      major_id: user.StudentDetail?.major_id ?? "",
      major_name: user.StudentDetail?.Major?.name ?? "",
      studentID: user.StudentDetail?.studentId ?? "",
      total_hours: user.StudentDetail?.total_hours ?? 0
    };

    res.status(200).json({ success: true, data: userData });
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { isActive: 1 },
      include: [{
        model: StudentDetails,
        include: [
          { 
            model: Faculty,
            attributes: ['id', 'name']
          },
          { 
            model: Major,
            attributes: ['id', 'name']
          }
        ]
      }],
      order: [
        ['createdAt', 'DESC']
      ]
    });

    const usersData = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      firstName: user.StudentDetail?.firstName ?? "",
      lastName: user.StudentDetail?.lastName ?? "",
      gender: user.StudentDetail?.gender ?? "",
      faculty_id: user.StudentDetail?.faculty_id ?? "",
      faculty_name: user.StudentDetail?.Faculty?.name ?? "",
      major_id: user.StudentDetail?.major_id ?? "",
      major_name: user.StudentDetail?.Major?.name ?? "",
      studentID: user.StudentDetail?.studentId ?? "",
      total_hours: user.StudentDetail?.total_hours ?? 0
    }));

    res.status(200).json({ 
      success: true, 
      data: usersData 
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
};

const getUserStats = async (req, res) => {
  try {
    // ดึงจำนวนผู้ใช้ทั้งหมด
    const totalUsers = await User.count({
      where: { isActive: 1 }
    });

    // ดึงผู้ใช้ใหม่เดือนนี้
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newUsersThisMonth = await User.count({
      where: {
        isActive: 1,
        createdAt: {
          [Op.gte]: startOfMonth
        }
      }
    });

    // คำนวณเปอร์เซ็นต์การเปลี่ยนแปลง
    const startOfLastMonth = new Date(startOfMonth);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

    const usersLastMonth = await User.count({
      where: {
        isActive: 1,
        createdAt: {
          [Op.gte]: startOfLastMonth,
          [Op.lt]: startOfMonth
        }
      }
    });

    const percentageChange = usersLastMonth > 0 
      ? ((newUsersThisMonth - usersLastMonth) / usersLastMonth) * 100 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        newUsersThisMonth,
        percentageChange: Math.round(percentageChange * 10) / 10
      }
    });

  } catch (error) {
    console.error('Error in getUserStats:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
};

const updateUserProfile = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.userId;
    const {
      username,
      email,
      phoneNumber,
      firstName,
      lastName,
      gender,
      faculty_id,
      major_id,
      studentID
    } = req.body;

    if (!validateEmail(email)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'รูปแบบอีเมลไม่ถูกต้อง'
      });
    }

    // อัพเดตข้อมูลผู้ใช้
    await User.update({
      username: sanitizeInput(username),
      email: email,
      phoneNumber: sanitizeInput(phoneNumber)
    }, {
      where: { id: userId },
      transaction: t
    });

    // เช็คว่ามีข้อมูลใน student_details หรือไม่
    const studentDetail = await StudentDetails.findOne({
      where: { user_id: userId },
      transaction: t
    });

    if (studentDetail) {
      // ถ้ามีข้อมูลแล้วให้ update
      await StudentDetails.update({
        firstName: sanitizeInput(firstName),
        lastName: sanitizeInput(lastName),
        gender: sanitizeInput(gender),
        faculty_id: faculty_id || null,
        major_id: major_id || null,
        studentId: sanitizeInput(studentID)
      }, {
        where: { user_id: userId },
        transaction: t
      });
    } else {
      // ถ้ายังไม่มีข้อมูลให้สร้างใหม่
      await StudentDetails.create({
        user_id: userId,
        firstName: sanitizeInput(firstName),
        lastName: sanitizeInput(lastName),
        gender: sanitizeInput(gender),
        faculty_id: faculty_id || null,
        major_id: major_id || null,
        studentId: sanitizeInput(studentID)
      }, {
        transaction: t
      });
    }

    await t.commit();
  
    res.json({
      success: true,
      message: 'อัพเดทข้อมูลสำเร็จ'
    });

  } catch (error) {
    await t.rollback();
    console.error('Error in updateUserProfile:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล'
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    // เช็คว่าผู้ที่เรียก API เป็น superadmin หรือไม่
    const requester = await User.findOne({
      where: { id: req.userId, isActive: 1 }
    });

    if (!requester || requester.role.toLowerCase() !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์ในการลบผู้ใช้'
      });
    }

    // ตรวจสอบว่ามีผู้ใช้ที่จะลบหรือไม่
    const userToDelete = await User.findOne({
      where: { id: req.params.id, isActive: 1 }
    });

    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้ที่ต้องการลบ'
      });
    }

    // Soft delete โดยการอัพเดต isActive เป็น 0
    await User.update(
      { isActive: 0 },
      { where: { id: req.params.id } }
    );

    res.status(200).json({
      success: true,
      message: 'ลบผู้ใช้สำเร็จ'
    });

  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบผู้ใช้'
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const requester = await User.findOne({
      where: { id: req.userId, isActive: 1 }
    });

    if (!requester || requester.role.toLowerCase() !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์ในการเปลี่ยนบทบาทผู้ใช้'
      });
    }

    const { role } = req.body; 
    const userId = req.params.id; 

  
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุบทบาทที่ต้องการเปลี่ยน'
      });
    }

   
    const validRoles = ['user', 'admin', 'superadmin'];
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'บทบาทไม่ถูกต้อง กรุณาระบุ user, admin หรือ superadmin'
      });
    }

   
    const userToUpdate = await User.findOne({
      where: { id: userId, isActive: 1 }
    });

    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้ที่ต้องการแก้ไข'
      });
    }

    
    if (userId === req.userId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถเปลี่ยนบทบาทของตัวเองได้'
      });
    }

   
    await User.update(
      { role: role.toLowerCase() },
      { where: { id: userId } }
    );

    res.status(200).json({
      success: true,
      message: 'อัพเดตบทบาทผู้ใช้สำเร็จ'
    });

  } catch (error) {
    console.error('Error in updateUserRole:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดตบทบาทผู้ใช้'
    });
  }
};

const getLoanStats = async (req, res) => {
  try {
    // หาจำนวนนักศึกษาที่มีสิทธิ์กู้ (total_hours >= 36)
    const eligibleCount = await StudentDetails.count({
      where: {
        total_hours: {
          [Op.gte]: 36
        }
      }
    });

    // หาจำนวนนักศึกษาทั้งหมด
    const totalStudents = await StudentDetails.count();

    // จำนวนนักศึกษาที่ไม่มีสิทธิ์กู้
    const notEligibleCount = totalStudents - eligibleCount;

    res.json({
      success: true,
      data: {
        eligible: eligibleCount,
        notEligible: notEligibleCount,
        total: totalStudents
      }
    });

  } catch (error) {
    console.error('Error in getLoanStats:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลสถิติได้'
    });
  }
};

const updateTotalHours = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.userId;

    // ใช้ raw query แทนการใช้ sequelize method
    const [[result]] = await sequelize.query(`
      SELECT 
        COALESCE(SUM(a.hours), 0) as total_hours
      FROM activity_registrations ar
      LEFT JOIN activities a ON ar.activity_id = a.id
      WHERE ar.user_id = :userId
      AND ar.status = 'สำเร็จ'
    `, {
      replacements: { userId },
      transaction: t
    });

    // อัพเดทจำนวนชั่วโมงในตาราง student_details
    await StudentDetails.update(
      { 
        total_hours: result.total_hours 
      },
      { 
        where: { user_id: userId },
        transaction: t
      }
    );

    await t.commit();

    res.json({
      success: true,
      data: {
        total_hours: Number(result.total_hours)
      }
    });

  } catch (error) {
    await t.rollback();
    console.error('Error updating total hours:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัพเดทจำนวนชั่วโมงได้'
    });
  }
};


module.exports = {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  getUserStats,
  deleteUser,
  updateUserRole,
  getLoanStats,
  updateTotalHours  
};
 