const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PlanActivity = sequelize.define('PlanActivity', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  plan_id: {
    type: DataTypes.CHAR(7),
    allowNull: false
  },
  activity_id: {
    type: DataTypes.CHAR(5),
    allowNull: false,
    references: {
      model: 'activities',
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'plan_activity',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PlanActivity;