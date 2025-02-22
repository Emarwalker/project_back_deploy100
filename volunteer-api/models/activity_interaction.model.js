const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActivityInteraction = sequelize.define('ActivityInteraction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  activity_id: {
    type: DataTypes.STRING(5),
    allowNull: false,
    references: {
      model: 'activities',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'expired'),
    allowNull: false,
    defaultValue: 'pending'
  },
  is_interested: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  evidence_file: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  hours_spent: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  created_at: {  // เปลี่ยนจาก createdAt เป็น created_at
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {  // เปลี่ยนจาก updatedAt เป็น updated_at
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'activity_interactions',
  timestamps: true,
  underscored: true,  // เพิ่ม option นี้เพื่อให้ใช้ snake_case
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'activity_id']
    }
  ]
});

// กำหนดความสัมพันธ์กับ Model อื่น
const Activity = require('./activity.model');
const User = require('./user.model');

ActivityInteraction.belongsTo(Activity, {
  foreignKey: 'activity_id',
  as: 'activity'
});

ActivityInteraction.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

module.exports = ActivityInteraction;