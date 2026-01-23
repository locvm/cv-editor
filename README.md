# PDF Privacy Redaction Server (PDR)

A specialized Node.js/Express microservice that automatically identifies and redacts phone numbers and email addresses from PDF documents (CVs/Resumes) using true text removal and visual overlays.

## Features

- **True Redaction**: Removes text data from PDF content streams (not just visual covering)
- **Visual Overlay**: Places light gray rectangles over redacted areas
- **Pattern Detection**: Uses regex to identify international phone numbers and email addresses
- **Zero-Retention**: Stateless in-memory processing with no disk storage
- **Security-First**: Built with helmet, CORS, and designed for secure environments

## Requirements

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file (optional):

```bash
cp .env.example .env
```

4. Configure environment variables in `.env` (optional):

```env
PORT=3000
MAX_FILE_SIZE_MB=10
ALLOWED_ORIGINS=*
NODE_ENV=development
```

## Usage

### Start the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`)

### Test the Server

Run the health check test:
```bash
node test-server.js
```

## API Endpoints

### 1. Health Check

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "ok",
  "service": "PDF Privacy Redaction Server",
  "version": "1.0.0"
}
```

### 2. Redact PDF

**Endpoint**: `POST /redact`

**Content-Type**: `multipart/form-data`

**Parameters**:
- `pdf` (file): The PDF file to redact

**Example using curl**:
```bash
curl -X POST \
  http://localhost:3000/redact \
  -F "pdf=@/path/to/your/resume.pdf" \
  -o redacted_resume.pdf
```

**Example using JavaScript/Fetch**:
```javascript
const formData = new FormData();
formData.append('pdf', fileInput.files[0]);

const response = await fetch('http://localhost:3000/redact', {
  method: 'POST',
  body: formData
});

const blob = await response.blob();
// Download or display the redacted PDF
```

**Response Headers**:
- `Content-Type`: `application/pdf`
- `Content-Disposition`: `attachment; filename="redacted_[original-filename].pdf"`
- `X-Redaction-Stats`: JSON string with redaction statistics
- `X-Processing-Time`: Processing time in milliseconds

**Success Response**: Returns the redacted PDF as a binary stream

**Error Responses**:

400 Bad Request:
```json
{
  "error": "No PDF file uploaded",
  "message": "Please upload a PDF file using the 'pdf' field"
}
```

413 Payload Too Large:
```json
{
  "error": "File too large",
  "message": "Maximum file size is 10MB"
}
```

500 Internal Server Error:
```json
{
  "error": "Failed to process PDF",
  "message": "Error details..."
}
```

### 3. Analyze PDF (without redacting)

**Endpoint**: `POST /analyze`

**Content-Type**: `multipart/form-data`

**Parameters**:
- `pdf` (file): The PDF file to analyze

**Example**:
```bash
curl -X POST \
  http://localhost:3000/analyze \
  -F "pdf=@/path/to/your/resume.pdf"
```

**Response**:
```json
{
  "found": true,
  "statistics": {
    "totalRedactions": 3,
    "emails": 1,
    "phones": 2,
    "pagesAffected": 1
  },
  "details": [
    {
      "page": 1,
      "items": [
        {
          "type": "email",
          "text": "john.doe@example.com",
          "coordinates": { "x": 100, "y": 200, "width": 150, "height": 12 }
        },
        {
          "type": "phone",
          "text": "+1-555-123-4567",
          "coordinates": { "x": 100, "y": 220, "width": 120, "height": 12 }
        }
      ]
    }
  ]
}
```

## Detection Patterns

### Email Addresses
- Standard format: `username@domain.com`
- Supports subdomains, hyphens, underscores, dots, plus signs

### Phone Numbers
- International format: `+1-555-123-4567`, `+44 20 1234 5678`
- Parentheses format: `(555) 123-4567`, `(02) 1234 5678`
- Separated format: `555-123-4567`, `555.123.4567`
- International prefix: `00 44 20 1234 5678`
- Compact format: `5551234567` (10-15 digits)

## Security Considerations

### Production Deployment

1. **HTTPS Required**: Always deploy with SSL/TLS certificate
2. **Environment Variables**: Set appropriate values in `.env`:
   ```env
   NODE_ENV=production
   ALLOWED_ORIGINS=https://yourdomain.com
   ```
3. **Firewall**: Restrict access to trusted IP ranges if possible
4. **Rate Limiting**: Consider adding rate limiting middleware for production
5. **Monitoring**: Implement logging and monitoring for suspicious activity

### Data Privacy

- **Stateless Processing**: All processing happens in-memory (RAM)
- **Zero-Retention**: No files are stored on disk
- **Memory Cleanup**: Data is automatically cleared after response is sent
- **PII Handling**: The server handles sensitive personal information - deploy securely

## Project Structure

```
cv-editor/
├── src/
│   ├── services/
│   │   ├── pdfExtractor.js    # Text extraction & coordinate detection
│   │   └── pdfRedactor.js     # PDF redaction logic
│   └── utils/
│       └── patterns.js         # Regex patterns for PII detection
├── server.js                   # Main Express server
├── test-server.js              # Server health test
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **PDF Manipulation**: pdf-lib
- **Text Extraction**: pdfjs-dist
- **File Upload**: multer
- **Security**: helmet, cors
- **Configuration**: dotenv

## Workflow

1. **Receive**: PDF arrives at the `/redact` endpoint via POST
2. **Scan**: Extract text and identify x,y coordinates of PII matches
3. **Wipe**: Remove text objects from PDF content stream
4. **Mask**: Draw light gray rectangles (#D3D3D3) over redacted areas
5. **Deliver**: Return the edited PDF to the client

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Try a different port: `PORT=3001 npm start`
- Verify all dependencies are installed: `npm install`

### PDF processing fails
- Ensure the uploaded file is a valid PDF
- Check file size (default limit: 10MB)
- Some complex PDFs may not be fully supported

### No PII detected
- Verify the PDF contains text (not just images)
- Check if phone numbers/emails match supported patterns
- Use `/analyze` endpoint to see what was detected

## Development

### Adding New Detection Patterns

Edit [src/utils/patterns.js](src/utils/patterns.js) to add new regex patterns:

```javascript
const NEW_PATTERN = /your-regex-here/g;
```

### Customizing Redaction Color

Edit [src/services/pdfRedactor.js](src/services/pdfRedactor.js):

```javascript
const REDACTION_COLOR = rgb(211 / 255, 211 / 255, 211 / 255);
```

## License

ISC

## Contributing

Contributions are welcome. Please ensure all changes maintain the security and privacy standards outlined in this document.

## Support

For issues and questions, please open an issue in the repository.
