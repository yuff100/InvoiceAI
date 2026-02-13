import express from 'express';
import cors from 'cors';
import { createWorker } from 'tesseract.js';
import { recognizeInvoiceFromImage } from '../../../lib/tesseract-ocr';

const router = express.Router();

// Enable CORS for all routes
router.use(cors());

// Configure JSON parsing for larger requests (for base64 images)
router.use(express.json({ limit: '50mb' }));
router.use(express.urlencoded({ limit: '50mb', extended: true }));

/**
 * OCR processing endpoint
 * POST /api/tesseract/ocr
 */
router.post('/ocr', async (req, res) => {
  try {
    console.log('=== Tesseract OCR API Called ===');
    
    const { imageUrl, imageBase64, extractFields = true } = req.body;

    // Validate request
    if (!imageUrl && !imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Either imageUrl or imageBase64 is required',
        errorCode: 'MISSING_IMAGE_DATA'
      });
    }

    console.log('Processing request:', {
      hasImageUrl: !!imageUrl,
      hasBase64: !!imageBase64,
      extractFields,
      baseUrl64Length: imageBase64 ? imageBase64.length : 0
    });

    let result;

    if (extractFields) {
      // Use the advanced invoice extraction
      result = await recognizeInvoiceFromImage(imageUrl || imageBase64);
    } else {
      // Use basic OCR without field extraction
      const worker = await createWorker('chi_sim');
      
      try {
        const { data: { text, confidence } } = await worker.recognize(imageUrl || imageBase64);
        
        result = {
          success: true,
          ocrText: text,
          confidence,
          fields: {},
          extractedFields: []
        };
        
        console.log('Basic OCR completed:', {
          textLength: text.length,
          confidence,
          preview: text.substring(0, 100)
        });
        
      } finally {
        await worker.terminate();
      }
    }

    console.log('✓ Tesseract OCR completed successfully');
    
    res.json({
      success: true,
      data: result,
      provider: 'tesseract',
      processingTime: result.processingTime || 0
    });

  } catch (error) {
    console.error('✗ Tesseract OCR processing failed:', error);
    
    // Determine error type for better client handling
    let errorCode = 'OCR_PROCESSING_ERROR';
    let statusCode = 500;
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      errorCode = 'IMAGE_FETCH_ERROR';
      statusCode = 400;
    } else if (error.message.includes('timeout')) {
      errorCode = 'OCR_TIMEOUT';
      statusCode = 408;
    } else if (error.message.includes('memory') || error.message.includes('size')) {
      errorCode = 'IMAGE_TOO_LARGE';
      statusCode = 413;
    }

    res.status(statusCode).json({
      success: false,
      error: error.message,
      errorCode,
      provider: 'tesseract'
    });
  }
});

/**
 * Health check endpoint
 * GET /api/tesseract/ocr/health
 */
router.get('/ocr/health', async (req, res) => {
  try {
    // Test Tesseract initialization
    const worker = await createWorker('chi_sim');
    await worker.terminate();
    
    res.json({
      success: true,
      status: 'healthy',
      provider: 'tesseract',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      provider: 'tesseract'
    });
  }
});

/**
 * Service status endpoint
 * GET /api/tesseract/status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    service: 'tesseract-ocr-api',
    version: '1.0.0',
    endpoints: {
      ocr: 'POST /api/tesseract/ocr',
      health: 'GET /api/tesseract/ocr/health',
      status: 'GET /api/tesseract/status'
    },
    features: {
      chineseTextRecognition: true,
      invoiceFieldExtraction: true,
      base64Support: true,
      urlSupport: true
    }
  });
});

export default router;
module.exports = router;