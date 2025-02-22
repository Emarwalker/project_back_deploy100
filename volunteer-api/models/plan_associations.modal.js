const Activity = require('./activity.model');
const PlanActivity = require('./planactivity.model');

// กำหนดความสัมพันธ์สำหรับ PlanActivity
PlanActivity.belongsTo(Activity, {
  foreignKey: 'activity_id',
  targetKey: 'id',
  as: 'Activity'
});

Activity.hasMany(PlanActivity, {
  foreignKey: 'activity_id',
  sourceKey: 'id',
  as: 'PlanActivities'
});

module.exports = { Activity, PlanActivity };