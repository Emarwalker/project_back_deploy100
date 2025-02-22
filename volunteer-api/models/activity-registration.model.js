const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Activity = require('./activity.model');

const ActivityRegistration = sequelize.define('activity_registrations', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER(5),
    allowNull: false
  },
  activity_id: {
    type: DataTypes.CHAR(5),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('กำลังดำเนินการ', 'สำเร็จ', 'ยกเลิก'),
    defaultValue: 'กำลังดำเนินการ',
    allowNull: false
  },
  registered_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// สร้าง Association
ActivityRegistration.belongsTo(Activity, {
  foreignKey: 'activity_id',
  as: 'activity'
});

module.exports = ActivityRegistration;