const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.post('/uploadfile', verifyToken, fileController.uploadFile);
router.get('/getfiles', verifyToken, fileController.getFiles);
router.get('/files/download/:id', verifyToken, fileController.downloadFile);
router.delete('/deletefile/:id', verifyToken, fileController.deleteFile);

module.exports = router;