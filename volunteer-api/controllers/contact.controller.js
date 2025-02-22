const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Admin email template
const adminEmailTemplate = (name, email, message) => `
  <div style="max-width: 600px; margin: 0 auto; font-family: 'Helvetica Neue', Arial, sans-serif;">
    <!-- Header -->
    <div style="background-color: #3BB77E; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">ข้อความติดต่อใหม่</h1>
    </div>
    
    <!-- Content -->
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
      <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="margin-bottom: 20px;">
          <h3 style="color: #3BB77E; margin: 0 0 5px 0;">ผู้ส่ง</h3>
          <p style="margin: 0; color: #333; font-size: 16px;">${name}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #3BB77E; margin: 0 0 5px 0;">อีเมล</h3>
          <p style="margin: 0; color: #333; font-size: 16px;">${email}</p>
        </div>
        
        <div>
          <h3 style="color: #3BB77E; margin: 0 0 5px 0;">ข้อความ</h3>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #3BB77E;">
            <p style="margin: 0; color: #333; font-size: 16px; line-height: 1.6;">${message}</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 20px; color: #666; font-size: 14px;">
      <p style="margin: 5px 0;">Volunteer System</p>
      <p style="margin: 5px 0;">© ${new Date().getFullYear()} All rights reserved.</p>
    </div>
  </div>
`;

// User auto-reply template
const userEmailTemplate = (name) => `
  <div style="max-width: 600px; margin: 0 auto; font-family: 'Helvetica Neue', Arial, sans-serif;">
    <!-- Header -->
    <div style="background-color: #3BB77E; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">ขอบคุณสำหรับการติดต่อ</h1>
    </div>
    
    <!-- Content -->
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
      <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">เรียน ${name}</p>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          ขอบคุณที่ติดต่อเรา เราได้รับข้อความของคุณเรียบร้อยแล้ว 
          ทีมงานของเราจะติดต่อกลับโดยเร็วที่สุด
        </p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            <strong>หมายเหตุ:</strong> นี่เป็นข้อความตอบกลับอัตโนมัติ 
            หากมีข้อสงสัยเพิ่มเติม สามารถติดต่อเราได้ตลอดเวลา
          </p>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 20px;">
      <p style="margin: 0 0 10px 0; color: #333;">ขอแสดงความนับถือ</p>
      <p style="margin: 0; color: #3BB77E; font-weight: bold;">ทีมงาน Volunteer System</p>
    </div>
    
    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px; margin: 5px 0;">
        © ${new Date().getFullYear()} Volunteer System. All rights reserved.
      </p>
    </div>
  </div>
`;

const contactController = {
  sendContactEmail: async (req, res) => {
    try {
      const { name, email, message } = req.body;

      if (!name || !email || !message) {
        throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
      }

      // ส่งอีเมลถึงแอดมิน
      await transporter.sendMail({
        from: {
          name: 'Volunteer System',
          address: process.env.EMAIL_USER
        },
        to: process.env.EMAIL_USER,
        subject: `ข้อความติดต่อใหม่จาก ${name}`,
        html: adminEmailTemplate(name, email, message)
      });

      // ส่งอีเมลตอบกลับ
      await transporter.sendMail({
        from: {
          name: 'Volunteer System',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: 'ขอบคุณสำหรับการติดต่อ Volunteer System',
        html: userEmailTemplate(name)
      });

      res.status(200).send({ message: 'ส่งข้อความเรียบร้อยแล้ว' });

    } catch (error) {
      console.error('Error:', error);
      res.status(500).send({ 
        message: error.message || 'เกิดข้อผิดพลาดในการส่งข้อความ' 
      });
    }
  }
};

module.exports = contactController;