const express = require("express");
const multer = require("multer");
const {
  getEditorUI,
  redactPDF_handler,
  analyzePDF_handler,
} = require("../controllers/editorController");

const router = express.Router();
const MAX_FILE_SIZE = (process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;

// Configure multer for in-memory file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// Routes
router.get("/", getEditorUI);
router.post("/redact", upload.single("pdf"), redactPDF_handler);
router.post("/analyze", upload.single("pdf"), analyzePDF_handler);

// Multer error handler
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "File too large",
        message: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
    }
  }
  if (error.message === "Only PDF files are allowed") {
    return res.status(400).json({
      error: "Invalid file type",
      message: "Only PDF files are allowed",
    });
  }
  next(error);
});

module.exports = router;
