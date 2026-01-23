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

// Import routes
const editorRoutes = require("./src/routes/editor");

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
app.use(express.static(path.join(__dirname)));

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
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
