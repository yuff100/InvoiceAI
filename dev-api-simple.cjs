require('dotenv').config();
const express = require('express');
const cors = require('cors');

delete require.cache[require.resolve('./src/pages/api/tesseract.cjs')];

const app = express();
app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// 发票识别专用prompt
const INVOICE_PROMPT = `请按下列JSON格式输出图中发票信息，不要输出其他内容:
{
    "invoiceCode": "发票代码",
    "invoiceNumber": "发票号码",
    "invoiceDate": "开票日期(格式: YYYY-MM-DD)",
    "sellerName": "销售方名称",
    "sellerTaxNumber": "销售方纳税人识别号",
    "buyerName": "购买方名称",
    "buyerTaxNumber": "购买方纳税人识别号",
    "totalSum": "金额合计(不含税)",
    "taxAmount": "税额合计",
    "totalAmount": "价税合计",
    "items": [
        {
            "name": "项目名称",
            "quantity": "数量",
            "unitPrice": "单价",
            "amount": "金额",
            "taxRate": "税率",
            "taxAmount": "税额"
        }
    ],
    "checkCode": "校验码"
}`;

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
    // 使用配置的CDN域名
    const domain = process.env.QINIU_DOMAIN || `https://${bucket}.deepnomind.com`;

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

// 智谱OCR处理
app.post('/api/ocr/process', async (req, res) => {
  try {
    console.log('📥 OCR request body:', req.body);
    const { fileUrl, fileName, taskId, provider } = req.body;

    if (!fileUrl || !fileName || !taskId) {
      console.log('❌ Missing required parameters:', { fileUrl: !!fileUrl, fileName: !!fileName, taskId: !!taskId });
      return res.status(400).json({ error: 'fileUrl, fileName, and taskId are required' });
    }

    const zhipuApiKey = process.env.ZHIPU_API_KEY;
    const ocrProvider = provider || process.env.OCR_PROVIDER || 'auto';

    // 根据provider选择OCR服务
    if (ocrProvider === 'tesseract' || (ocrProvider === 'auto' && !zhipuApiKey)) {
      console.log('🔄 Using Tesseract OCR');
      return await callTesseractOCR(fileUrl, res);
    }

    // 使用智谱OCR
    if (!zhipuApiKey) {
      return res.status(500).json({ error: 'ZHIPU_API_KEY not configured' });
    }

    console.log('🚀 Using Zhipu OCR');
    const ocrResult = await callZhipuOCR(fileUrl, zhipuApiKey);
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

// 智谱OCR调用（使用 layout_parsing API，下载图片转 base64）
async function callZhipuOCR(imageUrl, apiKey) {
  const apiUrl = 'https://open.bigmodel.cn/api/paas/v4/layout_parsing';

  console.log('🔥 Zhipu OCR Request for:', imageUrl);
  console.log('📥 Downloading and converting to base64...');
  
  try {
    // 下载图片
    console.log('📥 Downloading image from CDN...');
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      throw new Error(`Failed to download image from CDN: ${imageResponse.status}`);
    }

    const buffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // 检测图片格式
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    let mimeType = 'image/jpeg';
    
    if (contentType.includes('png')) {
      mimeType = 'image/png';
    } else if (contentType.includes('jpg') || contentType.includes('jpeg')) {
      mimeType = 'image/jpeg';
    } else if (imageUrl.toLowerCase().endsWith('.png')) {
      mimeType = 'image/png';
    }

    console.log('✅ Image downloaded');
    console.log('📊 Image size:', buffer.byteLength, 'bytes');
    console.log('📷 Image MIME type:', mimeType);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
      body: JSON.stringify({
        model: 'glm-ocr',
        file: `data:${mimeType};base64,${base64}`
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Zhipu API error:', response.status, errorText);
      throw new Error(`智谱API错误: ${response.status}`);
    }

    const result = await response.json();
    console.log('📥 Zhipu response received');
    console.log('📊 Response data:', JSON.stringify(result, null, 2));

    // glm-ocr 返回的是文档解析结果，包含 md_results 字段
    if (result.md_results) {
      console.log('📊 Usage:', result.usage);
      return parseZhipuOCRResponse(result);
    }

    throw new Error('智谱API返回格式异常');
  } catch (error) {
    console.error('❌ Zhipu OCR failed:', error);
    throw error;
  }
}

// 调用Tesseract OCR（fileUrl）
async function callTesseractOCR(imageUrl, res) {
  const tesseractUrl = 'http://localhost:3001/api/tesseract/ocr';

  try {
    const response = await fetch(tesseractUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: imageUrl, extractFields: true })
    });

    if (!response.ok) {
      throw new Error(`Tesseract API error: ${response.status}`);
    }

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('❌ Tesseract OCR failed:', error);
    res.status(500).json({
      success: false,
      error: 'Tesseract OCR调用失败: ' + error.message
    });
  }
}

// 解析智谱 OCR 返回内容（md_results 格式）
function parseZhipuOCRResponse(result) {
  try {
    const mdText = result.md_results || '';
    console.log('📋 Parsing markdown:', mdText.substring(0, 500));

    // 提取合计行的两个金额：合计¥394.06¥3.94
    const amountMatch = mdText.match(/合计[¥￥\$]*([\.\d,]+)[¥￥\$]*([\.\d,]+)/);
    const totalSum = amountMatch ? amountMatch[1] : '';
    const taxAmount = amountMatch ? amountMatch[2] : '';
    console.log('💰 Amount extraction:', { amountMatch: amountMatch ? amountMatch[0] : 'null', totalSum, taxAmount });

    // 提取价税合计：从"小写）¥398.00"中提取
    const totalAmountMatch = mdText.match(/小写[）\)][¥￥\$]+([\d.,]+)/) || mdText.match(/价税合计[\s\S]*?[¥￥\$]+([\d.,]+)/);
    const totalAmount = totalAmountMatch ? totalAmountMatch[1] : '';
    console.log('💰 Total amount extraction:', { totalAmountMatch: totalAmountMatch ? totalAmountMatch[0] : 'null', totalAmount });

    // 从 markdown 中提取发票信息
    const invoiceData = {
      invoiceCode: '',
      invoiceNumber: extractField(mdText, /发票号码[：:](\d+)/),
      invoiceDate: normalizeDate(extractField(mdText, /开票日期[：:]([\d年月日]+)/)),
      sellerName: extractField(mdText, /销售方信息[\s\S]*?名称[：:]([^\n统]+)/),
      sellerTaxNumber: extractField(mdText, /销售方[\s\S]*?统一社会信用代码\/纳税人识别号[：:]([A-Z0-9]+)/),
      buyerName: extractField(mdText, /购买方信息[\s\S]*?名称[：:]([^\n统]+)/),
      buyerTaxNumber: extractField(mdText, /购买方[\s\S]*?统一社会信用代码\/纳税人识别号[：:]([A-Z0-9]+)/),
      totalSum: cleanAmount(totalSum),
      taxAmount: cleanAmount(taxAmount),
      totalAmount: cleanAmount(totalAmount),
      checkCode: '',
      items: []
    };

    console.log('✅ Extracted invoice data:', invoiceData);

    return {
      success: true,
      data: {
        ocrResult: {
          success: true,
          data: invoiceData,
          confidence: calculateConfidence(invoiceData),
          rawText: mdText
        }
      }
    };
  } catch (error) {
    console.error('❌ Parse error:', error);
    return {
      success: false,
      error: '解析发票数据失败',
      rawText: result.md_results || ''
    };
  }
}

// 提取字段
function extractField(text, regex) {
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

// 解析智谱返回内容
function parseZhipuResponse(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        error: '无法从返回内容中提取JSON',
        rawText: content
      };
    }

    const data = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      data: {
        ocrResult: {
          success: true,
          data: {
            invoiceCode: data.invoiceCode || '',
            invoiceNumber: data.invoiceNumber || '',
            invoiceDate: normalizeDate(data.invoiceDate || ''),
            sellerName: data.sellerName || '',
            sellerTaxNumber: data.sellerTaxNumber || '',
            buyerName: data.buyerName || '',
            buyerTaxNumber: data.buyerTaxNumber || '',
            totalSum: cleanAmount(data.totalSum || ''),
            taxAmount: cleanAmount(data.taxAmount || ''),
            totalAmount: cleanAmount(data.totalAmount || ''),
            checkCode: data.checkCode || '',
            items: data.items || []
          },
          confidence: calculateConfidence(data)
        }
      }
    };
  } catch (error) {
    console.error('❌ Parse error:', error);
    return {
      success: false,
      error: '解析发票数据失败',
      rawText: content
    };
  }
}

function normalizeDate(dateStr) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  const cnMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (cnMatch) return `${cnMatch[1]}-${cnMatch[2].padStart(2, '0')}-${cnMatch[3].padStart(2, '0')}`;
  
  const numMatch = dateStr.match(/(\d{4})(\d{2})(\d{2})/);
  if (numMatch) return `${numMatch[1]}-${numMatch[2]}-${numMatch[3]}`;
  
  return dateStr;
}

function cleanAmount(amount) {
  if (!amount) return '';
  return amount.toString().replace(/[¥￥,，\s]/g, '').trim();
}

function calculateConfidence(data) {
  const keyFields = ['invoiceCode', 'invoiceNumber', 'invoiceDate', 'sellerName', 'buyerName', 'totalAmount'];
  const validFields = keyFields.filter(field => {
    const value = data[field];
    return value && String(value).trim().length > 0;
  });
  return Math.round((validFields.length / keyFields.length) * 100) / 100;
}

// 测试路由
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route working', timestamp: new Date().toISOString() });
});

// Tesseract路由
const tesseractRouter = require('./src/pages/api/tesseract.cjs');
console.log('Tesseract router loaded:', typeof tesseractRouter);
app.use('/api/tesseract', tesseractRouter);
console.log('Tesseract routes registered at /api/tesseract');

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});