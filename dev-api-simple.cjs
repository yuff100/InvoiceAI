require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Clear module cache on reload
delete require.cache[require.resolve('./src/pages/api/tesseract.cjs')];

const app = express();
app.use(cors());
// 增加JSON解析限制到200MB
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// 上传签名
app.post('/api/qiniu/signature', (req, res) => {
  try {
    console.log('📥 Upload signature request body:', req.body);
    const { fileName } = req.body;

    if (!fileName) {
      console.log('❌ fileName is missing');
      return res.status(400).json({ error: 'fileName is required' });
    }

    const accessKey = process.env.QINIU_ACCESS_KEY;
    const secretKey = process.env.QINIU_SECRET_KEY;
    const bucket = process.env.QINIU_BUCKET || 'invoice-ai';
    // 使用默认的七牛云CDN域名格式
    const domain = process.env.QINIU_DOMAIN || `http://${bucket}.qiniu.com`;

    if (!accessKey || !secretKey) {
      return res.status(500).json({ error: 'Qiniu credentials not configured' });
    }

    const qiniu = require('qiniu');
    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    const key = `invoices/${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${fileName}`;
    
    const putPolicy = new qiniu.rs.PutPolicy({
      scope: bucket,
      expires: 3600,
      returnBody: `{"key":"$(key)","hash":"$(etag)","bucket":"$(bucket)","fsize":$(fSize),"mimeType":"$(mimeType)"}`
    });
    
    const uploadToken = putPolicy.uploadToken(mac);
    const fileUrl = `${domain}/${key}`;
    
    const signature = {
      token: uploadToken,
      key: key,
              uploadUrl: 'https://up-as0.qiniup.com',
      fileUrl: fileUrl,
      expires: Date.now() + 3600 * 1000
    };

    res.json(signature);
  } catch (error) {
    console.error('Generate signature error:', error);
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
});

// OCR处理
app.post('/api/ocr/process', async (req, res) => {
  try {
    console.log('📥 OCR request body:', req.body);
    const { fileUrl, fileName, taskId } = req.body;

    if (!fileUrl || !fileName || !taskId) {
      console.log('❌ Missing required parameters:', { fileUrl: !!fileUrl, fileName: !!fileName, taskId: !!taskId });
      return res.status(400).json({ error: 'fileUrl, fileName, and taskId are required' });
    }

    const accessKey = process.env.QINIU_ACCESS_KEY;
    const secretKey = process.env.QINIU_SECRET_KEY;

    if (!accessKey || !secretKey) {
      return res.status(500).json({ error: 'Qiniu OCR credentials not configured' });
    }

    // 调用七牛云OCR API
    const qiniu = require('qiniu');
    const crypto = require('crypto');

    async function callQiniuOCR(imageUrl, accessKey, secretKey) {
      const apiUrl = 'https://ap-gate-z0.qiniuapi.com/ocr/vat/invoice';
      
      const requestData = {
        data: {
          uri: imageUrl
        }
      };

      console.log('🔥 Real OCR Request:', {
        url: apiUrl,
        data: requestData
      });

      const signingStr = `${apiUrl}\nPOST\n${JSON.stringify(requestData)}\nHost: ap-gate-z0.qiniuapi.com\nContent-Type:application/json`;
      const encodedStr = Buffer.from(signingStr, 'utf8').toString('base64');
      const signature = crypto.createHmac('sha1', secretKey).update(encodedStr).digest('base64');
      const urlSafeSignature = signature.replace(/\+/g, '-').replace(/\//g, '_');
      const accessToken = `Qiniu ${accessKey}:${urlSafeSignature}`;

      console.log('🔐 Real OCR Access Token:', accessToken.substring(0, 30) + '...');

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': accessToken
          },
          body: JSON.stringify(requestData)
        });

        console.log('🔍 Real OCR Status:', response.status);
        
        const responseText = await response.text();
        console.log('🔍 Real OCR Response:', responseText.substring(0, 200));
        
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('🚨 Real OCR Parse Error:', parseError);
          throw new Error(`Invalid JSON response: ${responseText}`);
        }

        if (result.status_code === 0) {
          const normalizedData = {
            invoiceCode: result.data?.InvoiceCode,
            invoiceNumber: result.data?.InvoiceNum,
            invoiceDate: result.data?.InvoiceDate,
            sellerName: result.data?.SellerName,
            sellerTaxNumber: result.data?.SellerRegisterNum,
            buyerName: result.data?.BuyerName,
            buyerTaxNumber: result.data?.BuyerRegisterNum,
            totalAmount: result.data?.TotalAmount,
            taxAmount: result.data?.TotalTax,
            checkCode: result.data?.CheckCode
          };

          return {
            success: true,
            data: {
              ocrResult: {
                success: true,
                data: normalizedData,
                confidence: 0.95
              }
            }
          };
        } else {
          throw new Error(result.message || 'OCR识别失败');
        }
      } catch (error) {
        console.error('🚨 Real OCR Request Error:', error);
        throw error;
      }
    }

    // 执行OCR调用
    const ocrResult = await callQiniuOCR(fileUrl, accessKey, secretKey);
    console.log('✅ OCR Result:', ocrResult);
    res.json(ocrResult);
    
  } catch (error) {
    console.error('OCR processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'OCR processing failed'
    });
  }
});

// 简单测试路由
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route working', timestamp: new Date().toISOString() });
});

// 导入Tesseract路由
const tesseractRouter = require('./src/pages/api/tesseract.cjs');
console.log('Tesseract router loaded:', typeof tesseractRouter);
app.use('/api/tesseract', tesseractRouter);
console.log('Tesseract routes registered at /api/tesseract');

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});