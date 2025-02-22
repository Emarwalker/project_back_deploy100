const Activity = require('./activity.model');
const ActivityCategory = require('./activity_category.model');

Activity.belongsTo(ActivityCategory, {
  foreignKey: 'category_id',
  as: 'ActivityCategory'
});

ActivityCategory.hasMany(Activity, {
  foreignKey: 'category_id',
  as: 'Activities'
});

module.exports = { Activity, ActivityCategory };