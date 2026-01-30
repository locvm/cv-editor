/**
 * Images to PDF Conversion Service
 * Converts PNG images back to a PDF document
 */

const { PDFDocument, PDFImage } = require('pdf-lib');

/**
 * Convert PNG images to PDF document
 * @param {Array} images - Array of image objects with base64 data and dimensions
 * @returns {Promise<Uint8Array>} PDF document as Uint8Array
 */
async function imagesToPDF(images) {
  try {
    if (!images || images.length === 0) {
      throw new Error('No images provided to convert to PDF');
    }

    console.log(`Converting ${images.length} image(s) to PDF...`);

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Process each image
    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageData.data, 'base64');
      
      // Embed the PNG image
      const pdfImage = await pdfDoc.embedPng(imageBuffer);
      
      // Add a new page with the image dimensions
      const page = pdfDoc.addPage([imageData.width, imageData.height]);
      
      // Draw the image on the page
      page.drawImage(pdfImage, {
        x: 0,
        y: 0,
        width: imageData.width,
        height: imageData.height,
      });

      console.log(`Page ${i + 1}/${images.length} added to PDF`);
    }

    // Save PDF to bytes
    const pdfBytes = await pdfDoc.save();
    
    console.log(`PDF created successfully: ${pdfBytes.length} bytes`);
    
    return pdfBytes;
  } catch (error) {
    console.error('Error converting images to PDF:', error);
    throw error;
  }
}

module.exports = {
  imagesToPDF,
};
