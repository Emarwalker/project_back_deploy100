const User = require('../models/user.model');
const LoginLog = require('../models/loginLog.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { Op } = require('sequelize');
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');

// Configure mail transporter
const transporter = nodemailer.createTransport({
 service: 'gmail',
 auth: {
   user: process.env.EMAIL_USER,
   pass: process.env.EMAIL_PASS
 }
});

// Rate limiters
const loginLimiter = rateLimit({
 windowMs: 15 * 60 * 1000,
 max: 5,
 message: {
   success: false,
   message: 'Too many login attempts, please try again later'
 }
});

// OTP storage
const otpStore = new Map();
const otpRequestLimit = new Map();
const otpAttempts = new Map();

// Check existing username/email
const checkExisting = async (req, res) => {
 try {
   const { username, email } = req.body;
   
   if (username) {
     const existingUser = await User.findOne({ where: { username } });
     return res.json({ exists: !!existingUser });
   }
   
   if (email) {
     const existingEmail = await User.findOne({ where: { email } });
     return res.json({ exists: !!existingEmail });
   }

   res.status(400).json({ message: 'Invalid request' });
 } catch (error) {
   console.error('Check existing error:', error);
   res.status(500).json({ 
     success: false,
     message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล'
   });
 }
};

// Register new user
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, email, password, phoneNumber } = req.body;

    // ตรวจสอบผู้ใช้ที่มีอยู่
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ?
          'อีเมลนี้ถูกใช้ไปแล้ว' :
          'ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว'
      });
    }

    // สร้าง salt และเข้ารหัสรหัสผ่านและเบอร์โทร
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const hashedPhoneNumber = await bcrypt.hash(phoneNumber, salt);

    // เก็บ 3 ตัวท้ายของเบอร์โทร
    const lastThreeDigits = phoneNumber.slice(-3);

    // สร้างผู้ใช้ใหม่
    await User.create({
      username,
      email,
      password: hashedPassword,
      phoneNumber: hashedPhoneNumber,
      lastThreeDigits
    });

    res.status(201).json({
      success: true,
      message: 'ลงทะเบียนสำเร็จ'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลงทะเบียน'
    });
  }
};


// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      where: { email }
    });

    // สร้างข้อมูลพื้นฐานสำหรับ log
    const logData = {
      email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // เช็คการล็อคบัญชี
    if (user && user.lockedUntil && user.lockedUntil > new Date()) {
      await LoginLog.create({
        ...logData,
        userId: user.id,
        status: 'locked',
        failReason: 'Account temporarily locked'
      });
      return res.status(423).json({
        success: false,
        message: 'บัญชีถูกระงับชั่วคราว กรุณาลองใหม่ภายหลัง'
      });
    }

    if (!user) {
      await LoginLog.create({
        ...logData,
        status: 'failed',
        failReason: 'User not found'
      });
      return res.status(401).json({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await user.increment('failedAttempts');
      
      // ล็อคบัญชีถ้า login ผิดเกิน 5 ครั้ง
      if (user.failedAttempts >= 5) {
        await user.update({
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000) // ล็อค 15 นาที
        });
        await LoginLog.create({
          ...logData,
          userId: user.id,
          status: 'locked',
          failReason: 'Account locked due to multiple failed attempts'
        });
      } else {
        await LoginLog.create({
          ...logData,
          userId: user.id,
          status: 'failed',
          failReason: 'Invalid password'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    // รีเซ็ตจำนวนครั้งที่ login ผิดเมื่อ login สำเร็จ
    if (user.failedAttempts > 0) {
      await user.update({
        failedAttempts: 0,
        lockedUntil: null
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // บันทึก log เมื่อ login สำเร็จ
    await LoginLog.create({
      ...logData,
      userId: user.id,
      status: 'success'
    });

    // เพิ่ม security headers
    res.set({
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block'
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    // บันทึก log กรณีเกิด error
    await LoginLog.create({
      email: req.body.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'error',
      failReason: error.message
    });

    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
    });
  }
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'รหัส OTP สำหรับรีเซ็ตรหัสผ่าน',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background-color: #3BB77E; padding: 20px; border-radius: 10px; text-align: center;">
          <h2 style="color: white; margin: 0;">รหัส OTP สำหรับรีเซ็ตรหัสผ่าน</h2>
        </div>
        <div style="padding: 20px; background: #f9f9f9; border-radius: 10px; margin-top: 20px;">
          <p style="font-size: 16px; color: #666;">รหัส OTP ของคุณคือ:</p>
          <div style="background: #fff; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <strong style="font-size: 24px; color: #3BB77E; letter-spacing: 5px;">${otp}</strong>
          </div>
          <p style="color: #666; font-size: 14px;">รหัสนี้จะหมดอายุใน 5 นาที</p>
        </div>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};

// Request password reset OTP
const forgotPassword = async (req, res) => {

 try {
   const { email } = req.body;
  

   // Check OTP request limit
   const userRequests = otpRequestLimit.get(email) || {
     count: 0,
     resetTime: Date.now()
   };

   // Reset count after 1 hour
   if (Date.now() > userRequests.resetTime + 3600000) {
     userRequests.count = 0;
     userRequests.resetTime = Date.now();
   }

   // Check if user has exceeded limit
   if (userRequests.count >= 2) {
     const timeLeft = Math.ceil((userRequests.resetTime + 3600000 - Date.now()) / 60000);
     return res.status(429).json({
       success: false,
       message: `คุณขอ OTP เกินกำหนด กรุณารออีก ${timeLeft} นาที`
     });
   }

   const user = await User.findOne({ where: { email } });


   if (!user) {
     return res.status(404).json({
       success: false,
       message: 'ไม่พบอีเมลนี้ในระบบ'
     });
   }

   const otp = otpGenerator.generate(6, {
     digits: true,
     alphabets: false,
     upperCase: false,
     specialChars: false
   });
  

   otpStore.set(email, {
     otp,
     expiry: Date.now() + 5 * 60 * 1000
   });

   // Increment request count
   userRequests.count++;
   otpRequestLimit.set(email, userRequests);

   try {
     await sendOTPEmail(email, otp);
   } catch (emailError) {
     console.error('Email sending error:', emailError);
     throw emailError;
   }

   res.json({
     success: true,
     message: 'ส่งรหัส OTP ไปยังอีเมลเรียบร้อยแล้ว'
   });
 } catch (error) {
   console.error('Forgot password error:', error);
   res.status(500).json({
     success: false,
     message: 'เกิดข้อผิดพลาดในการส่งรหัส OTP'
   });
 }
};

// Verify OTP and reset password
const verifyOTP = async (req, res) => {
 try {
   const { email, otp, newPassword } = req.body;

   // เช็คจำนวนครั้งที่ใส่ผิด
   const attempts = otpAttempts.get(email) || 0;
   if (attempts >= 3) {
     otpStore.delete(email); // ลบ OTP ทิ้ง
     otpAttempts.delete(email); // รีเซ็ตจำนวนครั้ง
     return res.status(400).json({
       success: false,
       message: 'ใส่รหัส OTP ผิดเกิน 3 ครั้ง กรุณาขอรหัสใหม่'
     });
   }

   const storedData = otpStore.get(email);
   if (!storedData || storedData.otp !== otp || Date.now() > storedData.expiry) {
     otpAttempts.set(email, attempts + 1);
     const attemptsLeft = 3 - (attempts + 1);
     return res.status(400).json({
       success: false,
       message: `รหัส OTP ไม่ถูกต้องหรือหมดอายุ (เหลือโอกาสอีก ${attemptsLeft} ครั้ง)`
     });
   }

   const salt = await bcrypt.genSalt(12);
   const hashedPassword = await bcrypt.hash(newPassword, salt);

   await User.update(
     { password: hashedPassword },
     { where: { email } }
   );

   // Clear OTP and attempts after successful verification
   otpStore.delete(email);
   otpAttempts.delete(email);

   res.json({
     success: true,
     message: 'รีเซ็ตรหัสผ่านสำเร็จ'
   });
 } catch (error) {
   console.error('OTP verification error:', error);
   res.status(500).json({
     success: false,
     message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'
   });
 }
};

// Logout user
const logout = (req, res) => {
 res.clearCookie('token');
 res.json({
   success: true,
   message: 'ออกจากระบบสำเร็จ'
 });
};

module.exports = {
 register,
 login,
 forgotPassword,
 verifyOTP,
 logout,
 loginLimiter,
 checkExisting
};