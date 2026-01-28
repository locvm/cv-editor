/**
 * Multer Configuration
 * Handles file upload settings and validation
 */

const multer = require("multer");

const MAX_FILE_SIZE = (process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

module.exports = { upload, MAX_FILE_SIZE };
