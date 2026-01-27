/**
 * PDF Privacy Redaction Server (PDR)
 * Removes phone numbers and emails from PDF documents
 */

require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes and controllers
const editorRoutes = require("./src/routes/editor");
const multer = require("multer");
const {
  redactPDF_handler,
  analyzePDF_handler,
} = require("./src/controllers/editorController");

// Configure multer for root-level routes
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

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    exposedHeaders: [
      "Content-Type",
      "Content-Length",
      "Content-Disposition",
      "X-Redaction-Stats",
      "X-Processing-Time",
    ],
  }),
);
app.use(express.json());

// Serve only the test client HTML (not entire directory for security)
app.get("/test-client.html", (req, res) => {
  res.sendFile(path.join(__dirname, "test-client.html"));
});

// ============================================
// ROUTES
// ============================================

// Home page
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "PDF Privacy Redaction Server",
    version: "1.0.0",
    message: "Welcome to the PDF Redaction Server",
    availableRoutes: {
      ui: "/editor - Interactive PDF redaction editor",
      api: "/api/editor - PDF editor API",
    },
  });
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
app.post("/analyze", upload.single("pdf"), analyzePDF_handler);
app.post("/redact", upload.single("pdf"), redactPDF_handler);

// Multer error handler for root-level routes
app.use((error, req, res, next) => {
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Server error:", error);

  // In production, don't expose error details
  const isProduction = process.env.NODE_ENV === "production";

  res.status(500).json({
    error: "Internal server error",
    message: isProduction ? "An error occurred while processing your request" : error.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   PDF Privacy Redaction Server (PDR)                      ║
║   Version: 1.0.0                                           ║
╟────────────────────────────────────────────────────────────╢
║   Server running on: http://localhost:${PORT}              ║
║   Status: Ready to redact PII from PDF documents          ║
╟────────────────────────────────────────────────────────────╢
║   Routes:                                                  ║
║   - GET  /          (API Info)                            ║
║   - GET  /editor    (PDF Editor UI)                       ║
║   - POST /api/editor/redact   (Redact PDF)                ║
║   - POST /api/editor/analyze  (Analyze PDF)               ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
