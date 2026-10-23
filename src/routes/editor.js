const express = require("express");
const {
  getEditorUI,
  redactPDF_handler,
  analyzePDF_handler,
} = require("../controllers/editorController");
const { upload } = require("../config/multer");

const router = express.Router();

// Routes
router.get("/", getEditorUI);
router.post("/redact", upload.single("file"), redactPDF_handler);
router.post("/analyze", upload.single("file"), analyzePDF_handler);

module.exports = router;
