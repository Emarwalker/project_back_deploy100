const logger = console; // ควรใช้ proper logging library ในระบบจริง

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  // Log error สำหรับ debugging (ไม่ส่งให้ client)
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // จัดการ error ตามประเภท
  if (err instanceof AppError) {
    // Known operational errors
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  // Sequelize errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'ข้อมูลไม่ถูกต้อง'
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'ข้อมูลซ้ำในระบบ'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'กรุณาเข้าสู่ระบบใหม่'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่'
    });
  }

  // Production vs Development error
  if (process.env.NODE_ENV === 'production') {
    // Production: ส่ง generic message
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง'
    });
  } else {
    // Development: ส่งรายละเอียดเพิ่มเติม
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      stack: err.stack
    });
  }
};

module.exports = {
  AppError,
  errorHandler
};