const { Op } = require('sequelize');
const sequelize = require('../config/database');
const ActivityCategory = require('../models/activity_category.model');

// แสดงหมวดหมู่ทั้งหมด
const getAllCategories = async (req, res) => {
  try {
    const categories = await ActivityCategory.findAll({
      where: { isActive: 1 },
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error in getAllCategories:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่'
    });
  }
};

// เพิ่มหมวดหมู่
const createCategory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name } = req.body;

    const existingCategory = await ActivityCategory.findOne({
      where: { 
        name: name,
        isActive: 1
      }
    });

    if (existingCategory) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'มีชื่อหมวดหมู่นี้อยู่แล้ว'
      });
    }

    const newCategory = await ActivityCategory.create({
      name,
      isActive: 1,
      createdBy: req.userId
    }, { transaction: t });

    await t.commit();

    res.status(201).json({
      success: true,
      message: 'เพิ่มหมวดหมู่สำเร็จ',
      data: newCategory
    });
  } catch (error) {
    await t.rollback();
    console.error('Error in createCategory:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่'
    });
  }
};

// แก้ไขหมวดหมู่
const updateCategory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { name } = req.body;

    const category = await ActivityCategory.findOne({
      where: { 
        id: id,
        isActive: 1
      }
    });

    if (!category) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบหมวดหมู่ที่ต้องการแก้ไข'
      });
    }

    const existingCategory = await ActivityCategory.findOne({
      where: { 
        name: name,
        id: { [Op.ne]: id },
        isActive: 1
      }
    });

    if (existingCategory) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'มีชื่อหมวดหมู่นี้อยู่แล้ว'
      });
    }

    await ActivityCategory.update({
      name,
      updatedBy: req.userId
    }, {
      where: { id: id },
      transaction: t
    });

    await t.commit();

    res.json({
      success: true,
      message: 'แก้ไขหมวดหมู่สำเร็จ'
    });
  } catch (error) {
    await t.rollback();
    console.error('Error in updateCategory:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขหมวดหมู่'
    });
  }
};

// ลบหมวดหมู่
const deleteCategory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const category = await ActivityCategory.findOne({
      where: { 
        id: id,
        isActive: 1
      }
    });

    if (!category) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบหมวดหมู่ที่ต้องการลบ'
      });
    }

    await ActivityCategory.update({
      isActive: 0,
      updatedBy: req.userId
    }, {
      where: { id: id },
      transaction: t
    });

    await t.commit();

    res.json({
      success: true,
      message: 'ลบหมวดหมู่สำเร็จ'
    });
  } catch (error) {
    await t.rollback();
    console.error('Error in deleteCategory:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบหมวดหมู่'
    });
  }
};

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
};