const Notification = require('./notification.model');
const User = require('./user.model');
const Activity = require('./activity.model'); 

// ความสัมพันธ์ระหว่าง Notification และ User
Notification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'User'
});

User.hasMany(Notification, {
  foreignKey: 'user_id',
  as: 'Notifications'
});

// เพิ่มความสัมพันธ์ระหว่าง Notification และ Activity
Notification.belongsTo(Activity, {
  foreignKey: 'reference_id',
  as: 'Activity'
});

Activity.hasMany(Notification, {
  foreignKey: 'reference_id',
  as: 'Notifications'
});

module.exports = { 
  Notification, 
  User,
  Activity 
};