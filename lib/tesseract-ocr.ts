require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Tesseract OCR服务
app.post('/api/tesseract/ocr', async (req, res) => {
  try {
    const { fileUrl } = req.body;
    
    if (!fileUrl) {
      return res.status(400).json({ error: 'fileUrl is required' });
    }

    // 验证七牛云凭证（如果用户有，优先使用七牛云）
    const qiniuAccessKey = process.env.QINIU_ACCESS_KEY;
    const qiniuSecretKey = process.env.QINIU_SECRET_KEY;
    
    // 下载图片
    console.log('🔥 Tesseract: Downloading image from:', fileUrl);
    const imageResponse = await fetch(fileUrl);
    
    if (!imageResponse.ok) {
      throw new Error('Failed to download image');
    }
    
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    console.log('🔥 Tesseract: Image downloaded, size:', imageBuffer.length);

    // 使用Tesseract进行识别
    console.log('🔥 Tesseract: Starting OCR recognition...');
    const Tesseract = require('tesseract.js');
    
    const result = await Tesseract.recognize(imageBuffer, 'chi_sim');
    
    console.log('📥 Tesseract: Recognition completed');
    
    const ocrResult = {
      success: true,
      data: {
        ocrResult: {
          success: true,
          data: {
            text: result.data.text,
            confidence: result.data.confidence / 100, // 转换为0-100范围
            invoiceFields: extractInvoiceFields(result.data.text)
          },
          confidence: result.data.confidence / 100
        }
      }
    };

    res.json({
      success: true,
      data: {
        ocrResult
      }
    });
    
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    res.status(500).json({
      success: false,
      error: 'OCR识别失败'
    });
  }
});

// 从识别文本中提取发票字段
function extractInvoiceFields(ocrText) {
  const fields = {};
  
  // 发票号码
  const invoiceNumberMatch = ocrText.match(/发票号码[:：]\s*(\d+)/);
  if (invoiceNumberMatch) {
    fields.invoiceNumber = invoiceNumberMatch[1];
  }
  
  // 发票代码
  const invoiceCodeMatch = ocrText.match(/发票代码[:：]\s*(\w+)/);
  if (invoiceCodeMatch) {
    fields.invoiceCode = invoiceCodeMatch[1];
  }
  
  // 发票日期
  const dateMatch = ocrText.match(/(\d{4})[年-./](\d{1,2})[月-./](\d{1,2})/);
  if (dateMatch) {
    fields.invoiceDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }
  
  // 销方名称
  const sellerMatch = ocrText.match(/销方名称[：]\s*([^：\n]*?)\s*(\n|$)/);
  if (sellerMatch) {
    fields.sellerName = sellerMatch[1].trim();
  }
  
  // 购方税号
  const taxNumberMatch = ocrText.match(/纳税人识别号[:：]\s*([A-Z0-9]{15,20})/);
  if (taxNumberMatch) {
    fields.sellerTaxNumber = taxNumberMatch[1];
  }
  
  // 购方金额
  const amountMatch = ocrText.match(/价税合计[：]\s*\d+\.\d{2,3}/);
  if (amountMatch) {
    fields.totalAmount = amountMatch[1];
  }
  
  // 校验码
  const checkCodeMatch = ocrText.match(/校验码[：]\s*\d{8}/);
  if (checkCodeMatch) {
    fields.checkCode = checkCodeMatch[1];
  }
  
  return fields;
}

const PORT = 3003;
app.listen(PORT, () => {
  console.log(`🚀 Tesseract OCR server running on http://localhost:${PORT}`);
});