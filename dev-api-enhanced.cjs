require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

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
    const domain = process.env.QINIU_DOMAIN || 'https://s3.qiniu.com';

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
      uploadUrl: 'https://up-as0.qiniuapi.com',
      fileUrl: fileUrl,
      expires: Date.now() + 3600 * 1000
    };

    res.json(signature);
  } catch (error) {
    console.error('Generate signature error:', error);
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
});

// OCR处理 - 使用真实七牛云OCR
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

  const qiniu = require('qiniu');
    const crypto = require('crypto');

    async function callQiniuOCR(imageUrl, accessKey, secretKey) {
      const apiUrl = 'https://api.qiniu.com/vs/vat/invoice';
      
      const requestData = {
        data: {
          uri: imageUrl
        }
      };

      const signingStr = `${apiUrl}\nPOST\n${JSON.stringify(requestData)}\nHost: api.qiniu.com\nContent-Type:application/json`;
      const encodedStr = Buffer.from(signingStr, 'utf8').toString('base64');
      const signature = crypto.createHmac('sha1', secretKey).update(encodedStr).digest('base64');
      const urlSafeSignature = signature.replace(/\+/g, '-').replace(/\//g, '_');
      const accessToken = `Qiniu ${accessKey}:${urlSafeSignature}`;

      console.log('🔥 Real OCR Request:', {
        url: apiUrl,
        data: requestData
      });

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
        console.log('🔍 Real OCR Response:', responseText);
        
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('🚨 OCR Parse Error:', parseError);
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

          console.log('✅ OCR Recognition successful:', normalizedData);

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
          const errorMessage = `OCR识别失败: ${result.message || '未知错误'}`;
          console.error('❌ OCR Error:', errorMessage);
          return {
            success: false,
            error: errorMessage
          };
        }
      } catch (error) {
        console.error('🚨 Real OCR Request Error:', error);
        throw new Error(`OCR处理失败: ${error.message}`);
      }
    }
      };

      const signingStr = `${apiUrl}\nPOST\n${JSON.stringify(requestData)}\nHost: api.qiniu.com\nContent-Type:application/json`;
      const encodedStr = Buffer.from(signingStr, 'utf8').toString('base64');
      const signature = crypto.createHmac('sha1', secretKey).update(encodedStr).digest('base64');
      const urlSafeSignature = signature.replace(/\+/g, '-').replace(/\//g, '_');
      const accessToken = `Qiniu ${accessKey}:${urlSafeSignature}`;

      console.log('🔥 Real OCR Request:', {
        url: apiUrl,
        data: requestData
      });

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
        console.log('🔍 Real OCR Response:', responseText);
        
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('🚨 OCR Parse Error:', parseError);
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

          console.log('✅ OCR Recognition successful:', normalizedData);

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
          const errorMessage = `OCR识别失败: ${result.message || '未知错误'}`;
          console.error('❌ OCR Error:', errorMessage);
          return {
            success: false,
            error: errorMessage
          };
        }
      } catch (error) {
        console.error('🚨 Real OCR Request Error:', error);
        return {
          success: false,
          error: `OCR请求失败: ${error.message}`
        };
      }
    }

    // 调用真实的七牛云OCR
    const ocrResult = await callQiniuOCR(fileUrl, accessKey, secretKey);
    
    const response = {
      success: true,
      data: {
        ocrResult: ocrResult
      }
    };

    console.log('✅ OCR Result sent to client:', response);
    res.json(response);
  } catch (error) {
    console.error('OCR processing error:', error);
    res.status(500).json({
      success: false,
      error: 'OCR processing failed'
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Enhanced API server running on http://localhost:${PORT}`);
});