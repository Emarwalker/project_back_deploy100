const multer = require('multer');
const path = require('path');
const File = require('../models/file.model');
const fs = require('fs');

// สร้างโฟลเดอร์สำหรับเก็บไฟล์ถ้ายังไม่มี
const uploadDir = 'uploadsfile';
if (!fs.existsSync(uploadDir)) {
 fs.mkdirSync(uploadDir, { recursive: true });
}

// กำหนดการตั้งค่าการจัดเก็บไฟล์
const storage = multer.diskStorage({

 destination: (req, file, cb) => {
   cb(null, 'uploadsfile/');
 },

 filename: (req, file, cb) => {
   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
   cb(null, uniqueSuffix + path.extname(file.originalname));
 }
});

// กำหนดการตั้งค่า multer สำหรับอัพโหลดไฟล์
const upload = multer({
 storage: storage,
 fileFilter: (req, file, cb) => {
   if (file.mimetype === 'application/pdf') {
     cb(null, true);
   } else {
     cb(new Error('กรุณาอัพโหลดไฟล์ PDF เท่านั้น'), false);
   }
 },

 limits: {
   fileSize: 5 * 1024 * 1024 
 }
});

const fileController = {

 getFiles: async (req, res) => {
   try {
     const files = await File.findAll({
       where: { user_id: req.userId },
       order: [['created_at', 'DESC']]
     });

     res.json({
       success: true,
       files: files || []
     });
   } catch (error) {
     console.error('[GetFiles] Error:', error);
     res.status(500).json({
       success: false,
       message: 'Error fetching files'
     });
   }
 },

 // อัพโหลดไฟล์ใหม่
 uploadFile: (req, res) => {
   upload.array('files')(req, res, async function(err) {
    
     if (err) {
       console.error('[Upload] Error:', err);
       return res.status(400).json({
         success: false,
         message: err.message
       });
     }

     try {
      
       const fileRecords = await File.bulkCreate(
         req.files.map(file => ({
           name: file.originalname,
           path: file.path,
           type: file.mimetype,
           size: file.size,
           user_id: req.userId
         }))
       );

       res.json({
         success: true,
         files: fileRecords
       });
     } catch (error) {
       console.error('[Upload] Database error:', error);
      
       req.files?.forEach(file => {
         if (fs.existsSync(file.path)) {
           fs.unlinkSync(file.path);
         }
       });

       res.status(500).json({
         success: false,
         message: 'Error saving to database'
       });
     }
   });
 },

 // ดาวน์โหลดไฟล์
 downloadFile: async (req, res) => {
   try {
     // ค้นหาไฟล์จากฐานข้อมูล
     const file = await File.findOne({
       where: {
         id: req.params.id,
         user_id: req.userId
       }
     });

     if (!file) {
       return res.status(404).json({
         success: false,
         message: 'ไม่พบไฟล์'
       });
     }

     // ตรวจสอบว่าไฟล์มีอยู่ในระบบจริง
     if (!fs.existsSync(file.path)) {
       return res.status(404).json({
         success: false,
         message: 'ไม่พบไฟล์ในระบบ'
       });
     }

     // ส่งไฟล์ให้ดาวน์โหลด
     res.download(file.path);
   } catch (error) {
     console.error('Download error:', error);
     res.status(500).json({
       success: false,
       message: 'ไม่สามารถดาวน์โหลดไฟล์ได้'
     });
   }
 },

 // ลบไฟล์
 deleteFile: async (req, res) => {
   try {
   
     const file = await File.findOne({
       where: {
         id: req.params.id,
         user_id: req.userId
       }
     });

     if (!file) {
       return res.status(404).json({
         success: false,
         message: 'ไม่พบไฟล์'
       });
     }

    
     if (fs.existsSync(file.path)) {
       fs.unlinkSync(file.path);
     }

   
     await file.destroy();

     res.json({
       success: true,
       message: 'ลบไฟล์สำเร็จ'
     });
   } catch (error) {
     console.error('Delete file error:', error);
     res.status(500).json({
       success: false,
       message: 'ไม่สามารถลบไฟล์ได้'
     });
   }
 }
};

module.exports = fileController;