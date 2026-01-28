/**
 * PDF Privacy Redaction Server (PDR)
 * Removes phone numbers and emails from PDF documents
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Import configurations
const { upload, MAX_FILE_SIZE } = require("./src/config/multer");

// Import middleware
const {
  multerErrorHandler,
  notFoundHandler,
  globalErrorHandler,
} = require("./src/middleware/errorHandler");

// Import utilities
const displayBanner = require("./src/utils/serverBanner");

// Import routes and controllers
const editorRoutes = require("./src/routes/editor");
const {
  redactPDF_handler,
  analyzePDF_handler,
} = require("./src/controllers/editorController");

// Minimal CORS - allow everything
app.use(cors());

// Note: express.json() is NOT used here because all POST routes use multipart/form-data
// for file uploads. Adding express.json() would interfere with multer parsing.

// Serve only the test client HTML (not entire directory for security)
app.get("/test-client.html", (req, res) => {
  res.sendFile(path.join(__dirname, "test-client.html"));
});

// ============================================
// ROUTES
// ============================================

// Home page
app.get("/", (req, res) => {
  res.json({ title: "PDF Privacy Redaction Server" });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "PDF Privacy Redaction Server",
    version: "1.0.0",
  });
});

// Register editor routes
app.use("/editor", editorRoutes);
app.use("/api/editor", editorRoutes);

// Mount specific endpoints at root level for backward compatibility
app.post(
  "/analyze",
  upload.single("file"),
  (req, res, next) => {
    console.log("File upload details:", {
      hasFile: !!req.file,
      filename: req.file?.originalname,
      mimetype: req.file?.mimetype,
      size: req.file?.size,
      bodyKeys: Object.keys(req.body),
    });
    next();
  },
  analyzePDF_handler,
);

app.post(
  "/redact",
  upload.single("file"),
  (req, res, next) => {
    console.log("File upload details:", {
      hasFile: !!req.file,
      filename: req.file?.originalname,
      mimetype: req.file?.mimetype,
      size: req.file?.size,
      bodyKeys: Object.keys(req.body),
    });
    next();
  },
  redactPDF_handler,
);

// Error handlers
app.use(multerErrorHandler(MAX_FILE_SIZE));
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
  displayBanner(PORT);
});

module.exports = { app, server };
