const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user.model');
const Faculty = require('./faculty.model');
const Major = require('./major.model');

const StudentDetails = sequelize.define('StudentDetails', {
 id: {
   type: DataTypes.INTEGER(11),
   primaryKey: true,
   autoIncrement: true
 },
 user_id: {
   type: DataTypes.INTEGER(11),
   allowNull: false,
   references: {
     model: User,
     key: 'id'
   }
 },
 firstName: {
   type: DataTypes.STRING(100),
   allowNull: true
 },
 lastName: {
   type: DataTypes.STRING(100),
   allowNull: true
 },
 gender: {
   type: DataTypes.ENUM('male', 'female', 'other'),
   allowNull: true
 },
 studentId: {
   type: DataTypes.STRING(14),
   allowNull: true
 },
 total_hours: {
   type: DataTypes.INTEGER(11),
   defaultValue: 0
 },
 faculty_id: {
   type: DataTypes.INTEGER(11),
   allowNull: true,
   references: {
     model: 'faculties',
     key: 'id'
   }
 },
 major_id: {
   type: DataTypes.INTEGER(11),
   allowNull: true,
   references: {
     model: 'majors',
     key: 'id' 
   }
 }
}, {
 tableName: 'student_details',
 timestamps: true
});

// Define associations
StudentDetails.belongsTo(User, { foreignKey: 'user_id' });
User.hasOne(StudentDetails, { foreignKey: 'user_id' });

StudentDetails.belongsTo(Faculty, { foreignKey: 'faculty_id' });
StudentDetails.belongsTo(Major, { foreignKey: 'major_id' });

module.exports = StudentDetails;

