const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Activity = sequelize.define('Activity', {
  id: {
    type: DataTypes.CHAR(5),
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  hours: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  month: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  format: {
    type: DataTypes.ENUM('ออนไลน์', 'ออนไซต์'),
    allowNull: true
  },
  max_attempts: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  image_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'activity_categories',
      key: 'id'
    }
  },
  interested_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  completed_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'activities',
  timestamps: true
});

module.exports = Activity;