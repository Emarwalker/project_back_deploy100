const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Activity, ActivityCategory } = require('../models/associations');
const ActivityRegistration = require('../models/activity-registration.model');
const ActivityInteraction = require('../models/activity_interaction.model');
const PlanActivity = require('../models/planactivity.model');
const { 
  User: UserWithAssoc, 
  StudentDetail: StudentDetailWithAssoc,
  ActivityRegistration: ActivityRegistrationWithAssoc
} = require('../models/associationsfile');

const { createActivityNotification } = require('./notification.controller'); 
const config = require('../config/config');

const DATE_COLUMN = 'created_at';
const REGISTRATION_DATE = 'registered_at';

const createActivity = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const generateId = () => {
      return Math.random().toString(36).substring(2, 7).toUpperCase();
    };

    let activityData = {
      id: generateId(),
      ...req.body,
      image_url: req.file ? `http://localhost:5001/uploads/${req.file.filename}` : null
    };

    // สร้างกิจกรรมใหม่
    const activity = await Activity.create(activityData, { transaction: t });
    await t.commit();

    // ส่ง response กลับก่อน
    res.status(201).json({
      success: true,
      data: activity
    });

    // สร้าง notification แยกออกมา
    process.nextTick(async () => {
      try {
        await createActivityNotification({
          id: activity.id,
          name: activity.name
        });
      } catch (notificationError) {
        console.error('Notification Error:', notificationError);
      }
    });

  } catch (error) {
    await t.rollback();
    console.error('Create activity error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการสร้างกิจกรรม'
    });
  }
};

const getAllActivities = async (req, res) => {
 try {
   const activities = await Activity.findAll({
     include: [{
       model: ActivityCategory,
       as: 'ActivityCategory',
       attributes: ['name']
     }],
     order: [['createdAt', 'DESC']] 
   });

   res.json({
     success: true,
     data: activities
   });
 } catch (error) {
   console.error('Error in getAllActivities:', error);
   res.status(500).json({
     success: false,
     message: 'เกิดข้อผิดพลาดในการดึงข้อมูลกิจกรรม'
   });
 }
};

const updateActivity = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      name, description, hours, month,
      format, max_attempts, category_id
    } = req.body;

    // เพิ่มการ validate ข้อมูล
    if (!name || !hours || !month || !format || !max_attempts || !category_id) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    const activity = await Activity.findByPk(id);
    if (!activity) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบกิจกรรมที่ต้องการแก้ไข'
      });
    }

    // แปลงค่าเป็น type ที่ถูกต้อง
    const updateData = {
      name,
      description: description || '',
      hours: parseInt(hours),
      month: parseInt(month),
      format,
      max_attempts: parseInt(max_attempts),
      category_id: parseInt(category_id)
    };

    if (req.file) {
      updateData.image_url = `${config.baseURL}/uploads/${req.file.filename}`;
    }


    // ใช้ await เพื่อรอการ update เสร็จสิ้น
    const [updatedRows] = await Activity.update(updateData, {
      where: { id },
      transaction: t
    });

    // ตรวจสอบว่ามีการ update จริงหรือไม่
    if (updatedRows === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถแก้ไขข้อมูลได้'
      });
    }

    // Fetch updated data to verify
    const updatedActivity = await Activity.findByPk(id, { transaction: t });

    await t.commit();
    
    res.json({
      success: true,
      message: 'แก้ไขกิจกรรมสำเร็จ',
      data: updatedActivity // ส่งข้อมูลที่อัพเดทกลับไปด้วย
    });

  } catch (error) {
    await t.rollback();
    console.error('Error in updateActivity:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขกิจกรรม',
      error: error.message
    });
  }
};

const deleteActivity = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const activity = await Activity.findByPk(id);
 
    if (!activity) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบกิจกรรมที่ต้องการลบ'
      });
    }
 
    // ลบข้อมูลจากตาราง plan_activity ก่อน (ถ้ามี)
    await PlanActivity.destroy({
      where: { activity_id: id },
      transaction: t
    });
 
    // ลบข้อมูลจากตาราง activity_registrations
    await ActivityRegistration.destroy({
      where: { activity_id: id },
      transaction: t
    });
 
    // ลบข้อมูลจากตาราง activity_interactions 
    await ActivityInteraction.destroy({
      where: { activity_id: id },
      transaction: t
    });
 
    // ลบข้อมูลจากตาราง activities
    await Activity.destroy({
      where: { id },
      transaction: t
    });
 
    await t.commit();
    res.json({
      success: true,
      message: 'ลบกิจกรรมสำเร็จ'
    });
 
  } catch (error) {
    await t.rollback();
    console.error('Error in deleteActivity:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบกิจกรรม'
    });
  }
 };

 const getActivityStats = async (req, res) => {
  try {
    const { id: activityId } = req.params;
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบกิจกรรม'
      });
    }

    // ใช้ model ที่มี associations
    const [completedStats, interestedStats] = await Promise.all([
      ActivityRegistrationWithAssoc.findAll({
        where: {
          activity_id: activityId,
          status: 'สำเร็จ'
        },
        include: [{
          model: UserWithAssoc,
          as: 'User',
          include: [{
            model: StudentDetailWithAssoc,
            as: 'StudentDetails',
            attributes: ['studentId', 'firstName', 'lastName', 'major_id']
          }]
        }],
        order: [['updated_at', 'DESC']]
      }),
      ActivityRegistrationWithAssoc.findAll({
        where: {
          activity_id: activityId
        },
        include: [{
          model: UserWithAssoc,
          as: 'User',
          include: [{
            model: StudentDetailWithAssoc,
            as: 'StudentDetails',
            attributes: ['studentId', 'firstName', 'lastName', 'major_id']
          }]
        }],
        order: [['registered_at', 'DESC']]
      })
    ]);

    // แปลงข้อมูล
    const formattedCompletedStats = completedStats.map(stat => ({
      studentId: stat.User.StudentDetails.studentId,
      firstName: stat.User.StudentDetails.firstName,
      lastName: stat.User.StudentDetails.lastName,
      major_id: stat.User.StudentDetails.major_id,
      registered_at: stat.registered_at,
      updated_at: stat.updated_at
    }));

    const formattedInterestedStats = interestedStats.map(stat => ({
      studentId: stat.User.StudentDetails.studentId,
      firstName: stat.User.StudentDetails.firstName,
      lastName: stat.User.StudentDetails.lastName,
      major_id: stat.User.StudentDetails.major_id,
      registered_at: stat.registered_at,
      updated_at: stat.updated_at
    }));

    res.json({
      success: true,
      data: {
        completed: formattedCompletedStats,
        interested: formattedInterestedStats
      }
    });

  } catch (error) {
    console.error('Error in getActivityStats:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลสถิติกิจกรรมได้'
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    // คำนวณจำนวนชั่วโมงทั้งหมดและค่าเฉลี่ย
    const totalHours = await Activity.sum('hours');
    const totalActivities = await Activity.count();
    const avgHoursPerActivity = totalHours / totalActivities || 0;
 
    // คำนวณจำนวนผู้เข้าร่วมทั้งหมด
    const totalParticipants = await ActivityRegistration.count();
 
    // คำนวณกิจกรรมในเดือนนี้
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
 
    const currentMonthActivities = await Activity.count({
      where: {
        createdAt: {
          [Op.between]: [firstDayOfMonth, lastDayOfMonth]
        }
      }
    });
 
    // คำนวณกิจกรรมในเดือนที่แล้ว
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    const lastMonthActivities = await Activity.count({
      where: {
        createdAt: {
          [Op.between]: [firstDayOfLastMonth, lastDayOfLastMonth]
        }
      }
    });
 
    // คำนวณเปอร์เซ็นต์การเปลี่ยนแปลง
    const activityChangePercent = lastMonthActivities === 0 
      ? 100 
      : ((currentMonthActivities - lastMonthActivities) / lastMonthActivities * 100);
 
    // คำนวณอัตราความสำเร็จ
    const successfulRegistrations = await ActivityRegistration.count({
      where: { status: 'สำเร็จ' }
    });
 
    // คำนวณอัตราความสำเร็จเดือนที่แล้ว
    const lastMonthSuccessful = await ActivityRegistration.count({
      where: {
        status: 'สำเร็จ',
        registered_at: {
          [Op.between]: [firstDayOfLastMonth, lastDayOfLastMonth]
        }
      }
    });
 
    const lastMonthTotal = await ActivityRegistration.count({
      where: {
        registered_at: {
          [Op.between]: [firstDayOfLastMonth, lastDayOfLastMonth]
        }
      }
    });
 
    const successRate = (successfulRegistrations / totalParticipants * 100) || 0;
    const lastMonthSuccessRate = (lastMonthSuccessful / lastMonthTotal * 100) || 0;
    const successRateChange = successRate - lastMonthSuccessRate;
 
    // ข้อมูลกราฟรายเดือน (3 เดือนล่าสุด)
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    
    const monthlyStats = await Promise.all(
      Array.from({ length: 3 }, (_, i) => {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
 
        return Promise.all([
          Activity.count({
            where: {
              createdAt: {
                [Op.between]: [firstDay, lastDay]
              }
            }
          }),
          ActivityRegistration.count({
            where: {
              registered_at: {
                [Op.between]: [firstDay, lastDay]
              }
            }
          })
        ]).then(([activityCount, participantCount]) => ({
          name: months[date.getMonth()],
          จำนวนกิจกรรม: activityCount,
          ผู้เข้าร่วม: participantCount
        }));
      })
    );
 
    res.json({
      success: true,
      data: {
        stats: [
          {
            title: "จำนวนชั่วโมงทั้งหมด",
            value: `${totalHours} ชั่วโมง`,
            subValue: `เฉลี่ย ${avgHoursPerActivity.toFixed(1)} ชั่วโมง/กิจกรรม`,
            color: "blue"
          },
          {
            title: "ผู้เข้าร่วมทั้งหมด",
            value: `${totalParticipants} คน`,
            subValue: `จาก ${totalActivities} กิจกรรม`,
            color: "green"
          },
          {
            title: "กิจกรรมในเดือนนี้",
            value: `${currentMonthActivities} กิจกรรม`,
            subValue: `${activityChangePercent.toFixed(1)}% จากเดือนที่แล้ว`,
            color: "purple"
          },
          {
            title: "อัตราการเข้าร่วมสำเร็จ",
            value: `${successRate.toFixed(1)}%`,
            subValue: `${successRateChange >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(successRateChange).toFixed(1)}% จากเดือนที่แล้ว`,
            color: "orange"
          }
        ],
        monthlyData: monthlyStats.reverse()
      }
    });
 
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลสถิติได้'
    });
  }
 };

const getTopActivities = async (req, res) => {
  try {
    // ดึงข้อมูลกิจกรรมทั้งหมดพร้อมจำนวนผู้สนใจและผู้เข้าร่วมสำเร็จ
    const activities = await Activity.findAll({
      attributes: [
        'id',
        'name',
        'interested_count',  // จากฟิลด์ที่มีอยู่แล้ว
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM activity_registrations
            WHERE activity_registrations.activity_id = Activity.id
            AND activity_registrations.status = 'สำเร็จ'
          )`),
          'completed'
        ]
      ],
      order: [
        ['interested_count', 'DESC']
      ],
      limit: 5
    });

    const formattedData = activities.map(activity => ({
      name: activity.name,
      interested: activity.interested_count,
      completed: parseInt(activity.dataValues.completed)
    }));

    res.json({
      success: true,
      data: formattedData
    });

  } catch (error) {
    console.error('Error in getTopActivities:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลกิจกรรมยอดนิยมได้'
    });
  }
};

const checkUserAttempts = async (req, res) => {
  try {
    const { activityId } = req.params;
    
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // นับจำนวนครั้งที่ user นี้ทำกิจกรรมนี้ทั้งหมด (ทั้งกำลังดำเนินการและสำเร็จ)
    const attempts = await ActivityRegistration.count({
      where: {
        activity_id: activityId,
        user_id: req.userId,
        status: {
          [Op.in]: ['กำลังดำเนินการ', 'สำเร็จ']
        }
      }
    });

    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบกิจกรรม'
      });
    }

    res.json({
      success: true,
      data: {
        attempts,
        max_attempts: activity.max_attempts,
        canRegister: attempts < activity.max_attempts
      }
    });

  } catch (error) {
    console.error('Error in checkUserAttempts:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบจำนวนครั้งที่ทำกิจกรรม'
    });
  }
};

const getAvailableActivities = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. หากิจกรรมที่ user เคยทำหรือกำลังทำอยู่
    const registeredActivities = await ActivityRegistration.findAll({
      where: {
        user_id: userId,
        status: {
          [Op.in]: ['กำลังดำเนินการ', 'สำเร็จ']
        }
      },
      attributes: ['activity_id']
    });

    // 2. รวบรวม ID ของกิจกรรมที่เคยทำ
    const registeredActivityIds = registeredActivities.map(reg => reg.activity_id);

    // 3. ดึงกิจกรรมที่ยังไม่เคยทำ
    const availableActivities = await Activity.findAll({
      where: {
        id: {
          [Op.notIn]: registeredActivityIds
        }
      },
      include: [{
        model: ActivityCategory,
        as: 'ActivityCategory',
        attributes: ['name']
      }]
    });

    res.json({
      success: true,
      data: availableActivities
    });

  } catch (error) {
    console.error('Get available activities error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลกิจกรรม'
    });
  }
};

module.exports = {
  createActivity,
  getAllActivities,
  updateActivity,
  deleteActivity,
  getActivityStats,
  getDashboardStats,
  getTopActivities,
  checkUserAttempts,
  getAvailableActivities
}; 