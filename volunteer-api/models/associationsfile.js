const User = require('./user.model');
const ActivityRegistration = require('./activity-registration.model');
const StudentDetail = require('./student_details.model');
const Activity = require('./activity.model');

// ActivityRegistration กับ User
ActivityRegistration.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'User'
});

User.hasMany(ActivityRegistration, {
  foreignKey: 'user_id',
  as: 'Registrations'  // เปลี่ยนชื่อ alias
});

// User กับ StudentDetail
User.hasOne(StudentDetail, {
  foreignKey: 'user_id',
  as: 'StudentDetails'  
});

StudentDetail.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'UserInfo'  
});

ActivityRegistration.belongsTo(Activity, {
  foreignKey: 'activity_id',
  as: 'Activity'
});

Activity.hasMany(ActivityRegistration, {
  foreignKey: 'activity_id',
  as: 'ActivityRegistrations'  
});

module.exports = {
  User,
  ActivityRegistration,
  StudentDetail,
  Activity
};