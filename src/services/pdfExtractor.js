/**
 * PDF Text Extraction Service
 * Uses pdfjs-dist to extract text and coordinates from PDF documents
 */

const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { containsPII, findEmails, findPhones } = require('../utils/patterns');

// Disable worker for server-side usage
pdfjsLib.GlobalWorkerOptions.workerSrc = null;

/**
 * Extract text items with coordinates from a PDF buffer
 * @param {Buffer} pdfBuffer - The PDF file as a buffer
 * @returns {Promise<Array>} Array of pages with text items containing PII
 */
async function extractPIICoordinates(pdfBuffer) {
  try {
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      disableFontFace: false
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    const piiItems = [];

    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const pageHeight = viewport.height;
      const pageItems = [];

      // Check each text item for PII
      textContent.items.forEach((item) => {
        const text = item.str.trim();

        if (!text || text.length === 0) return;

        // Check if text contains PII
        if (containsPII(text)) {
          // Transform coordinates from PDF space to standard coordinates
          const transform = item.transform;
          const x = transform[4];
          const y = pageHeight - transform[5]; // Flip Y coordinate
          const width = item.width;
          const height = item.height;

          // Find all emails in this text
          const emails = findEmails(text);
          emails.forEach(email => {
            // For now, use the full text item bounds
            // In a more sophisticated version, we could calculate exact positions
            pageItems.push({
              text: email,
              x: x,
              y: y - height,
              width: width,
              height: height,
              type: 'email'
            });
          });

          // Find all phones in this text
          const phones = findPhones(text);
          phones.forEach(phone => {
            pageItems.push({
              text: phone,
              x: x,
              y: y - height,
              width: width,
              height: height,
              type: 'phone'
            });
          });
        }
      });

      if (pageItems.length > 0) {
        piiItems.push({
          pageNumber: pageNum,
          items: pageItems,
          pageHeight: pageHeight,
          pageWidth: viewport.width
        });
      }
    }

    return piiItems;
  } catch (error) {
    console.error('Error extracting PII coordinates:', error);
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}

/**
 * Extract all text content from PDF for debugging
 * @param {Buffer} pdfBuffer - The PDF file as a buffer
 * @returns {Promise<string>} All text content
 */
async function extractAllText(pdfBuffer) {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer)
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    let allText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');

      allText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
    }

    return allText;
  } catch (error) {
    console.error('Error extracting all text:', error);
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}

module.exports = {
  extractPIICoordinates,
  extractAllText
};
