/**
 * Server Startup Banner
 * Displays server information on startup
 */

function displayBanner(PORT) {
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
}

module.exports = displayBanner;
