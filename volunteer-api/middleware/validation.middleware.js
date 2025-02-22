const { body } = require('express-validator');

const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3 })
    .withMessage('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร ตัวเลข และ _ เท่านั้น'),
  body('email')
    .isEmail()
    .withMessage('รูปแบบอีเมลไม่ถูกต้อง'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    .matches(/[A-Z]/)
    .withMessage('รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
    .matches(/[a-z]/)
    .withMessage('รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว'),
  body('phoneNumber')
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก')
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('รูปแบบอีเมลไม่ถูกต้อง'),
  body('password')
    .not()
    .isEmpty()
    .withMessage('กรุณากรอกรหัสผ่าน')
];

const validateProfileUpdate = [
  body('username')
    .trim()
    .isLength({ min: 3 })
    .matches(/^[a-zA-Z0-9_]+$/),
  body('email')
    .isEmail()
    .withMessage('รูปแบบอีเมลไม่ถูกต้อง'),
  body('phoneNumber')
    .optional()
    .matches(/^[0-9]{10}$/),
  body('firstName')
    .trim()
    .optional()
    .isLength({ min: 2 }),
  body('lastName')
    .trim()
    .optional()
    .isLength({ min: 2 }),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other']),
  body('faculty_id')
    .optional()
    .isNumeric(),
  body('major_id')
    .optional()
    .isNumeric(),
  body('studentID')
    .optional()
    .matches(/^\d{12}-\d$/)
    .withMessage('รหัสนักศึกษาต้องอยู่ในรูปแบบ XXXXXXXXXXXX-X (ตัวเลข 13 หลัก แบบใส่ -)')
];

// เพิ่มฟังก์ชันสำหรับ sanitize input ทั่วไป
const sanitizeInput = (input) => {
  return input ? input.trim() : null;
};

// เพิ่มฟังก์ชันสำหรับ validate email
const validateEmail = (email) => {
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return re.test(email);
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  sanitizeInput,
  validateEmail
};