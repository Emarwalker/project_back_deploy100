const sequelize = require('../config/database');
const { Activity, PlanActivity } = require('../models/plan_associations.modal');

// สร้างแผนกิจกรรม
const createPlanActivity = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { plan_id, activity_id } = req.body;

    // ตรวจสอบว่า activity_id มีอยู่จริงหรือไม่
    const activity = await Activity.findByPk(activity_id);
    if (!activity) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบกิจกรรมที่ระบุ'
      });
    }

    // สร้างแผนกิจกรรมใหม่
    const newPlanActivity = await PlanActivity.create({
      plan_id,
      activity_id
    }, { 
      transaction: t,
      include: [{
        model: Activity,
        as: 'Activity'
      }]
    });

    await t.commit();

    // ดึงข้อมูลที่สร้างพร้อมข้อมูลกิจกรรม
    const createdPlan = await PlanActivity.findByPk(newPlanActivity.id, {
      include: [{
        model: Activity,
        as: 'Activity',
        attributes: ['name', 'description']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'เพิ่มแผนกิจกรรมสำเร็จ',
      data: createdPlan
    });

  } catch (error) {
    await t.rollback();
    console.error('Error in createPlanActivity:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเพิ่มแผนกิจกรรม'
    });
  }
};

// ดึงรายการแผนกิจกรรมทั้งหมด
const getAllPlanActivities = async (req, res) => {
  try {
    const planActivities = await PlanActivity.findAll({
      include: [{
        model: Activity,
        as: 'Activity',
        attributes: ['name', 'description']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: planActivities
    });

  } catch (error) {
    console.error('Error in getAllPlanActivities:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแผนกิจกรรม'
    });
  }
};

// อัพเดทแผนกิจกรรม
const updatePlanActivity = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { plan_id, activity_id } = req.body;

    const planActivity = await PlanActivity.findByPk(id);
    if (!planActivity) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบแผนกิจกรรมที่ต้องการแก้ไข'
      });
    }

    // ตรวจสอบว่า activity_id ใหม่มีอยู่จริงหรือไม่
    if (activity_id) {
      const activity = await Activity.findByPk(activity_id);
      if (!activity) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'ไม่พบกิจกรรมที่ระบุ'
        });
      }
    }

    // อัพเดทข้อมูล
    await PlanActivity.update({
      plan_id,
      activity_id
    }, {
      where: { id },
      transaction: t
    });

    await t.commit();

    // ดึงข้อมูลที่อัพเดทพร้อมข้อมูลกิจกรรม
    const updatedPlan = await PlanActivity.findByPk(id, {
      include: [{
        model: Activity,
        as: 'Activity',
        attributes: ['name', 'description']
      }]
    });

    res.json({
      success: true,
      message: 'อัพเดทแผนกิจกรรมสำเร็จ',
      data: updatedPlan
    });

  } catch (error) {
    await t.rollback();
    console.error('Error in updatePlanActivity:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทแผนกิจกรรม'
    });
  }
};

// ลบแผนกิจกรรม
const deletePlanActivity = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const planActivity = await PlanActivity.findByPk(id, {
      include: [{
        model: Activity,
        as: 'Activity',
        attributes: ['name']
      }]
    });

    if (!planActivity) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบแผนกิจกรรมที่ต้องการลบ'
      });
    }

    await PlanActivity.destroy({
      where: { id },
      transaction: t
    });

    await t.commit();

    res.json({
      success: true,
      message: 'ลบแผนกิจกรรมสำเร็จ',
      data: {
        id,
        activityName: planActivity.Activity?.name
      }
    });

  } catch (error) {
    await t.rollback();
    console.error('Error in deletePlanActivity:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบแผนกิจกรรม'
    });
  }
};

const getPlanActivityById = async (req, res) => {
  try {
    const { planId } = req.params;
 
    const planActivities = await PlanActivity.findAll({
      where: { plan_id: planId },
      include: [{
        model: Activity,
        as: 'Activity',
        attributes: [
          'id',  // เปลี่ยนจาก ['id', 'activity_id'] เป็น 'id'
          'name',
          'description',
          'hours', 
          'month',
          'format',
          'image_url'
        ]
      }],
      order: [['created_at', 'DESC']]
    });
 
    if (!planActivities || planActivities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบแผนกิจกรรมที่ระบุ'
      });
    }
 
    // แปลงข้อมูลให้ตรงกับ format ที่ต้องการ
    const formattedActivities = planActivities.map(plan => {
      const activityData = plan.Activity.dataValues;
      return {
        activity_id: activityData.id.padStart(5, '0'), // แปลง id เป็น format "00000"
        name: activityData.name,
        description: activityData.description || '',
        hours: activityData.hours,
        month: activityData.month,
        format: activityData.format,
        image_url: activityData.image_url || '',
        category: '',  // เพิ่ม default category
        plan_activity_id: plan.id
      };
    });
 
    res.json({
      success: true,
      data: formattedActivities
    });
 
  } catch (error) {
    console.error('Error in getPlanActivityById:', error);
    console.error('Full error:', JSON.stringify(error, null, 2));
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแผนกิจกรรม'
    });
  }
 };

module.exports = {
  createPlanActivity,
  getAllPlanActivities,
  updatePlanActivity,
  deletePlanActivity,
  getPlanActivityById
};