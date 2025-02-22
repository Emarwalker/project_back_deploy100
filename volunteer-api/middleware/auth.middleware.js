const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const verifyAsync = promisify(jwt.verify);

const verifyToken = async (req, res, next) => {
  try {
    // Get token from header or cookie
    const token = req.headers.authorization?.split(' ')[1] || 
                 req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ Token กรุณาเข้าสู่ระบบ'
      });
    }

    // Verify token
    const decoded = await verifyAsync(token, process.env.JWT_SECRET);
    
    // Check token expiration
    if (decoded.exp <= Date.now() / 1000) {
      return res.status(401).json({
        success: false,
        message: 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่'
      });
    }

    // Add user info to request
    req.userId = decoded.id;
    req.userRole = decoded.role;
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้องหรือหมดอายุ'
    });
  }
};

const verifyRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req?.userRole) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    const rolesArray = [...allowedRoles];
    const hasRole = rolesArray.includes(req.userRole);
    
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึง'
      });
    }
    
    next();
  }
};

const verifyAdmin = verifyRoles('admin', 'superadmin');

module.exports = { verifyToken, verifyRoles, verifyAdmin };