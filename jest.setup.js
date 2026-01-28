// Jest setup file for test environment configuration
// This file intercepts pdfjs-dist imports and provides mocks for testing

// Since pdfjs-dist uses ESM and dynamic imports that don't work well in Jest,
// we need to mock the entire module before any tests run

// Store the original require
const Module = require('module');
const originalRequire = Module.prototype.require;

// Override require to intercept pdfjs-dist imports
Module.prototype.require = function(id) {
  if (id === 'pdfjs-dist/legacy/build/pdf.mjs' || id === 'pdfjs-dist/build/pdf.mjs') {
    // Return a mock pdfjs library
    return Promise.resolve({
      getDocument: jest.fn((options) => {
        // Create mock page
        const mockPage = {
          getTextContent: jest.fn().mockResolvedValue({
            items: []
          }),
          getViewport: jest.fn((params) => ({
            width: 612,
            height: 792,
            scale: params.scale || 1.0
          }))
        };

        // Create mock document
        const mockDocument = {
          numPages: 1,
          getPage: jest.fn().mockResolvedValue(mockPage)
        };

        // Return mock loading task
        return {
          promise: Promise.resolve(mockDocument)
        };
      }),
      GlobalWorkerOptions: {
        workerSrc: ''
      }
    });
  }

  // For all other requires, use the original
  return originalRequire.apply(this, arguments);
};

// Also need to handle dynamic imports
// Override the global import function if it exists
if (typeof global.import === 'undefined') {
  global.import = async function(specifier) {
    if (specifier === 'pdfjs-dist/legacy/build/pdf.mjs' || specifier === 'pdfjs-dist/build/pdf.mjs') {
      // Return the same mock as above
      return {
        getDocument: jest.fn((options) => {
          const mockPage = {
            getTextContent: jest.fn().mockResolvedValue({
              items: []
            }),
            getViewport: jest.fn((params) => ({
              width: 612,
              height: 792,
              scale: params.scale || 1.0
            }))
          };

          const mockDocument = {
            numPages: 1,
            getPage: jest.fn().mockResolvedValue(mockPage)
          };

          return {
            promise: Promise.resolve(mockDocument)
          };
        }),
        GlobalWorkerOptions: {
          workerSrc: ''
        }
      };
    }
    throw new Error(`Cannot find module '${specifier}'`);
  };
}
