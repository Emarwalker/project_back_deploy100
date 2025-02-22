require('dotenv').config();

module.exports = {
  
  baseURL: process.env.BASE_URL || 'http://localhost:5001',
  port: process.env.PORT || 5001,

  // Database Configuration
  database: {
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    dialect: 'mysql',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '1d'
  },

  // Upload Configuration
  upload: {
    path: 'uploads/',
    maxSize: 5 * 1024 * 1024 // 5MB
  }
};