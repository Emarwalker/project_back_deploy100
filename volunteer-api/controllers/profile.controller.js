const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Activity = require('../models/activity.model');
const ActivityRegistration = require('../models/activity-registration.model');

const profileController = {
  getRegisteredActivities: async (req, res) => {
    try {
      const registrations = await ActivityRegistration.findAll({
        where: { user_id: req.userId },
        include: [{
          model: Activity,
          as: 'activity',
          attributes: [
            'id', 'name', 'description', 'hours', 
            'format', 'image_url', 'category_id',
            'interested_count'
          ]
        }],
        order: [['registered_at', 'DESC']]
      });
  
      res.json({
        success: true,
        data: registrations
      });
    } catch (error) {
      console.error('Error in getRegisteredActivities:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลกิจกรรมที่ลงทะเบียนได้'
      });
    }
  },

  registerActivities: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { activities } = req.body;
  
      // ตรวจสอบว่ามี activities ส่งมาหรือไม่
      if (!activities || !Array.isArray(activities) || activities.length === 0) {
        throw new Error('Invalid activities data');
      }
  
      // ตรวจสอบการลงทะเบียนที่มีอยู่แล้ว
      const existingRegistrations = await ActivityRegistration.findAll({
        where: {
          user_id: req.userId,
          activity_id: activities.map(a => a.activity_id)
        },
        transaction: t
      });

      // แยกกิจกรรมที่ยังไม่ได้ลงทะเบียน
      const existingActivityIds = new Set(existingRegistrations.map(reg => reg.activity_id));
      const newActivities = activities.filter(activity => !existingActivityIds.has(activity.activity_id));

      // ถ้าไม่มีกิจกรรมใหม่เลย
      if (newActivities.length === 0) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'ทุกกิจกรรมได้ลงทะเบียนไปแล้ว'
        });
      }
  
      // บันทึกเฉพาะกิจกรรมที่ยังไม่ได้ลงทะเบียน
      const registrations = await ActivityRegistration.bulkCreate(
        newActivities.map(activity => ({
          user_id: req.userId,
          activity_id: activity.activity_id,
          status: 'กำลังดำเนินการ',
          registered_at: new Date()
        })),
        { transaction: t }
      );
  
      // อัพเดท interested_count สำหรับกิจกรรมใหม่เท่านั้น
      await Activity.increment('interested_count', {
        by: 1,
        where: {
          id: newActivities.map(a => a.activity_id)
        },
        transaction: t
      });
  
      await t.commit();

      // ส่งข้อความตอบกลับพร้อมรายละเอียด
      const skippedCount = activities.length - newActivities.length;
      let message = 'ลงทะเบียนกิจกรรมสำเร็จ';
      if (skippedCount > 0) {
        message += ` (${newActivities.length} รายการ, ข้ามไป ${skippedCount} รายการที่ลงทะเบียนแล้ว)`;
      }

      res.json({
        success: true,
        message,
        registered: newActivities.length,
        skipped: skippedCount,
        registeredActivities: newActivities.map(a => a.activity_id)
      });
  
    } catch (error) {
      await t.rollback();
      console.error('Error in registerActivities:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'ไม่สามารถลงทะเบียนกิจกรรมได้'
      });
    }
  },

  updateActivityStatus: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { activityId } = req.params;
      const { status } = req.body;

      if (!['กำลังดำเนินการ', 'สำเร็จ', 'ยกเลิก'].includes(status)) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'สถานะไม่ถูกต้อง'
        });
      }

      const registration = await ActivityRegistration.findOne({
        where: {
          user_id: req.userId,
          activity_id: activityId
        },
        transaction: t
      });

      if (!registration) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลการลงทะเบียนกิจกรรม'
        });
      }

      if (status === 'สำเร็จ' && registration.status !== 'สำเร็จ') {
        await Activity.increment('completed_count', {
          where: { id: activityId },
          transaction: t
        });
      }

      await registration.update({ status }, { transaction: t });
      await t.commit();

      res.json({
        success: true,
        message: 'อัพเดทสถานะกิจกรรมสำเร็จ'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error in updateActivityStatus:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถอัพเดทสถานะกิจกรรมได้'
      });
    }
  },

  deleteActivity: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { activityId } = req.params;
  
      // ตรวจสอบว่ามีการลงทะเบียนอยู่หรือไม่
      const registration = await ActivityRegistration.findOne({
        where: {
          user_id: req.userId,
          activity_id: activityId
        },
        include: [{
          model: Activity,
          as: 'activity'
        }],
        transaction: t
      });
  
      if (!registration) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลการลงทะเบียนกิจกรรม'
        });
      }

      // ลด interested_count ลง 1 เมื่อยกเลิกการลงทะเบียน
      await Activity.decrement('interested_count', {
        where: { id: activityId },
        transaction: t
      });
  
      // ลบการลงทะเบียน
      await registration.destroy({ transaction: t });
  
      await t.commit();
      res.json({
        success: true,
        message: 'ลบการลงทะเบียนกิจกรรมสำเร็จ'
      });
  
    } catch (error) {
      await t.rollback();
      console.error('Error in deleteActivity:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถลบการลงทะเบียนกิจกรรมได้'
      });
    }
  }
};

module.exports = profileController;