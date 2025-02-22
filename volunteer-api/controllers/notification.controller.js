const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Notification, User } = require('../models/Notification_associations.modal');
const { getIO } = require('../config/socket');

// Catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
 console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const createActivityNotification = async (activityData) => {
  const t = await sequelize.transaction();
  try {
    if (!activityData?.id || !activityData?.name) {
      await t.rollback();
      return null;
    }

    // ดึงเฉพาะ user ids ก่อน
    const userIds = await User.findAll({
      attributes: ['id'],
      where: { 
        role: 'user',
        isActive: true 
      },
      raw: true
    });

    if (!userIds.length) {
      await t.rollback();
      return null;
    }

    // Batch insert notifications
    const notificationData = userIds.map(user => ({
      user_id: user.id,
      title: 'มีกิจกรรมใหม่',
      message: `กิจกรรมใหม่: ${activityData.name}`,
      type: 'new_activity',
      reference_id: activityData.id,
      is_read: 0,
    }));

    const notifications = await Notification.bulkCreate(notificationData, { 
      transaction: t 
    });

    await t.commit();

    // ส่ง WebSocket notifications แยกออกมา
    process.nextTick(() => {
      const io = getIO();
      if (io) {
        userIds.forEach(user => {
          const userNotification = notifications.find(n => n.user_id === user.id);
          if (userNotification) {
            io.to(`user_${user.id}`).emit('newNotification', userNotification);
          }
        });
      }
    });

    return notifications;

  } catch (error) {
    await t.rollback();
    console.error('Notification creation error:', {
      message: error.message,
      stack: error.stack,
      data: activityData
    });
    return null;
  }
};

const getUserNotifications = async (req, res) => {
 try {
   const userId = req.userId;

   if (!userId) {
     return res.status(401).json({
       success: false,
       message: 'กรุณาเข้าสู่ระบบ'
     });
   }

   const notifications = await Notification.findAll({
     where: { user_id: userId },
     order: [['created_at', 'DESC']],
     include: [{
       model: User,
       as: 'User',
       attributes: ['username']
     }]
   });

   res.json({
     success: true,
     data: notifications
   });

 } catch (error) {
   console.error('Error in getUserNotifications:', error);
   res.status(500).json({
     success: false,
     message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการแจ้งเตือน'
   });
 }
};

const markAsRead = async (req, res) => {
 const t = await sequelize.transaction();
 try {
   const { id } = req.params;
   const userId = req.userId;

   if (!userId) {
     await t.rollback();
     return res.status(401).json({
       success: false,
       message: 'กรุณาเข้าสู่ระบบ'
     });
   }

   const notification = await Notification.findOne({
     where: { 
       id,
       user_id: userId,
       is_read: false
     },
     transaction: t
   });

   if (!notification) {
     await t.rollback();
     return res.status(404).json({
       success: false,
       message: 'ไม่พบการแจ้งเตือนหรือถูกอ่านแล้ว'
     });
   }

   await notification.update({ 
     is_read: true 
   }, { transaction: t });

   await t.commit();

   const io = getIO();
   if (io) {
     io.to(`user_${userId}`).emit('notificationRead', id);
   }

   res.json({
     success: true,
     message: 'อัพเดทสถานะการอ่านสำเร็จ',
     data: notification
   });

 } catch (error) {
   await t.rollback();
   console.error('Error in markAsRead:', error);
   res.status(500).json({
     success: false,
     message: 'เกิดข้อผิดพลาดในการอัพเดทสถานะการอ่าน'
   });
 }
}; 

const markAllAsRead = async (req, res) => {
 const t = await sequelize.transaction();
 try {
   const userId = req.userId;

   if (!userId) {
     await t.rollback();
     return res.status(401).json({
       success: false,
       message: 'กรุณาเข้าสู่ระบบ'
     });
   }

   const updatedCount = await Notification.update(
     { is_read: true },
     { 
       where: { 
         user_id: userId,
         is_read: false
       },
       transaction: t
     }
   );

   await t.commit();

   const io = getIO();
   if (io) {
     io.to(`user_${userId}`).emit('allNotificationsRead');
   }

   res.json({
     success: true,
     message: 'อัพเดทสถานะการอ่านทั้งหมดสำเร็จ',
     count: updatedCount[0]  // จำนวนรายการที่อัพเดท
   });

 } catch (error) {
   await t.rollback();
   console.error('Error in markAllAsRead:', error);
   res.status(500).json({
     success: false,
     message: 'เกิดข้อผิดพลาดในการอัพเดทสถานะการอ่านทั้งหมด'
   });
 }
};

const deleteNotification = async (req, res) => {
 const t = await sequelize.transaction();
 try {
   const { id } = req.params;
   const userId = req.userId;

   if (!userId) {
     await t.rollback();
     return res.status(401).json({
       success: false,
       message: 'กรุณาเข้าสู่ระบบ'
     });
   }

   const notification = await Notification.findOne({
     where: { 
       id,
       user_id: userId
     },
     transaction: t
   });

   if (!notification) {
     await t.rollback();
     return res.status(404).json({
       success: false,
       message: 'ไม่พบการแจ้งเตือน'
     });
   }

   await notification.destroy({ transaction: t });

   await t.commit();

   const io = getIO();
   if (io) {
     io.to(`user_${userId}`).emit('notificationDeleted', id);
   }

   res.json({
     success: true,
     message: 'ลบการแจ้งเตือนสำเร็จ',
     data: { id }
   });

 } catch (error) {
   await t.rollback();
   console.error('Error in deleteNotification:', error);
   res.status(500).json({
     success: false,
     message: 'เกิดข้อผิดพลาดในการลบการแจ้งเตือน'
   });
 }
};

module.exports = {
 createActivityNotification,
 getUserNotifications,
 markAsRead,
 markAllAsRead,
 deleteNotification
};