const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActivityCategory = sequelize.define('ActivityCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    collate: 'utf8mb4_general_ci'
  },
  isActive: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
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
  tableName: 'activity_categories',
  timestamps: true
});

module.exports = ActivityCategory;