const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LoginLog = sequelize.define('LoginLog', {
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  failReason: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = LoginLog;