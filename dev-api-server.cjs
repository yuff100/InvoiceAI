require('dotenv').config();
const express = require('express');
const cors = require('cors');
const qiniu = require('qiniu');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/qiniu/signature', (req, res) => {
  try {
    const { fileName } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    const accessKey = process.env.QINIU_ACCESS_KEY;
    const secretKey = process.env.QINIU_SECRET_KEY;
    const bucket = process.env.QINIU_BUCKET || 'invoice-ai';
    const domain = process.env.QINIU_DOMAIN || 'https://s3.qiniu.com';

    if (!accessKey || !secretKey) {
      return res.status(500).json({ error: 'Qiniu credentials not configured' });
    }

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
      uploadUrl: 'https://up.qbox.me',
      fileUrl: fileUrl,
      expires: Date.now() + 3600 * 1000
    };

    res.json(signature);
  } catch (error) {
    console.error('Generate signature error:', error);
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
});

app.post('/api/ocr/process', async (req, res) => {
  try {
    const { fileUrl, fileName, taskId } = req.body;

    if (!fileUrl || !fileName || !taskId) {
      return res.status(400).json({ error: 'fileUrl, fileName, and taskId are required' });
    }

    const accessKey = process.env.QINIU_ACCESS_KEY;
    const secretKey = process.env.QINIU_SECRET_KEY;

    if (!accessKey || !secretKey) {
      return res.status(500).json({ error: 'Qiniu OCR credentials not configured' });
    }

    const ocrResult = await callQiniuOCR(fileUrl, accessKey, secretKey);

    const response = {
      success: true,
      data: {
        ocrResult
      }
    };

    res.json(response);
  } catch (error) {
    console.error('OCR processing error:', error);
    
    const response = {
      success: false,
      error: error.message || 'OCR processing failed'
    };

    res.status(500).json(response);
  }
});

async function callQiniuOCR(imageUrl, accessKey, secretKey) {
  const apiUrl = 'https://ap-gate-z0.qiniuapi.com/ocr/vat/invoice';
  
  const requestData = {
    data: {
      uri: imageUrl
    }
  };

  console.log('Request URL:', apiUrl);
  console.log('Request Data:', JSON.stringify(requestData, null, 2));

  const accessToken = generateAccessToken(apiUrl, 'POST', JSON.stringify(requestData), accessKey, secretKey);
  console.log('Access Token:', accessToken);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Qiniu ${accessToken}`
      },
      body: JSON.stringify(requestData)
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response Body:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      throw new Error(`Invalid JSON response: ${responseText}`);
    }

  if (result.code === 0) {
    return {
      success: true,
      data: normalizeFields(result.data),
      confidence: calculateConfidence(result.data)
    };
  } else {
    throw new Error(result.message || 'OCR识别失败');
  }
}

function generateAccessToken(url, method, body, accessKey, secretKey) {
  const crypto = require('crypto');
  const signingStr = `${url}\n${method}\n${body}\nHost: ap-gate-z0.qiniuapi.com\nContent-Type:application/json`;
  const encodedStr = Buffer.from(signingStr, 'utf8').toString('base64');
  const signature = crypto.createHmac('sha1', secretKey).update(encodedStr).digest('base64');
  const urlSafeSignature = signature.replace(/\+/g, '-').replace(/\//g, '_');
  return `Qiniu ${accessKey}:${urlSafeSignature}`;
}

function normalizeFields(data) {
  return {
    invoiceCode: data.InvoiceCode,
    invoiceNumber: data.InvoiceNum,
    invoiceDate: normalizeDate(data.InvoiceDate),
    sellerName: data.SellerName,
    sellerTaxNumber: data.SellerRegisterNum,
    buyerName: data.BuyerName,
    buyerTaxNumber: data.BuyerRegisterNum,
    totalAmount: data.TotalAmount,
    taxAmount: data.TotalTax,
    checkCode: data.CheckCode
  };
}

function normalizeDate(dateStr) {
  if (!dateStr) return '';
  
  const patterns = [
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    /(\d{4})(\d{2})(\d{2})/
  ];
  
  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  return dateStr;
}

function calculateConfidence(data) {
  const fields = [
    'InvoiceCode', 'InvoiceNum', 'InvoiceDate',
    'SellerName', 'SellerRegisterNum', 'BuyerName', 'BuyerRegisterNum',
    'TotalAmount', 'TotalTax', 'CheckCode'
  ];
  
  const validFields = fields.filter(field => {
    const value = data[field];
    return value && typeof value === 'string' && value.trim().length > 0;
  });
  
  return Math.min(validFields.length / fields.length, 1);
}

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});