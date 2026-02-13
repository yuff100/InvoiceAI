require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createWorker } = require('tesseract.js');

const router = express.Router();

// Enable CORS for all routes
router.use(cors());

// Configure JSON parsing for larger requests (for base64 images)
router.use(express.json({ limit: '200mb' }));
router.use(express.urlencoded({ limit: '200mb', extended: true }));

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
      base64Length: imageBase64 ? imageBase64.length : 0
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

/**
 * 识别发票图像中的文本和字段
 */
async function recognizeInvoiceFromImage(imageUrlOrBase64) {
  const startTime = Date.now();
  
  try {
    console.log('🔥 Starting Tesseract OCR recognition...');
    
    // 创建Tesseract worker，设置超时
    const worker = await Promise.race([
      createWorker('chi_sim'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Worker creation timeout')), 30000)
      )
    ]);
    
    try {
      // 进行OCR识别，设置超时
      const ocrPromise = worker.recognize(imageUrlOrBase64);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OCR timeout after 60s')), 60000)
      );
      
      const { data: { text, confidence } } = await Promise.race([ocrPromise, timeoutPromise]);
      
      console.log('📥 Tesseract recognition completed:', {
        textLength: text.length,
        confidence,
        preview: text.substring(0, 100)
      });
      
      // 提取发票字段
      const fields = extractInvoiceFields(text);
      const extractedFields = Object.entries(fields).map(([field, value]) => ({
        field,
        value,
        confidence: confidence / 100 // 转换为0-1范围
      }));
      
      // 清理原始OCR文本
      const cleanedText = cleanOCRText(text);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        ocrText: cleanedText,         // 返回清理后的文本
        rawOcrText: text,             // 保留原始文本供参考
        confidence: confidence / 100, // 转换为0-1范围
        fields,
        extractedFields,
        processingTime
      };
      
    } finally {
      // 清理worker
      await worker.terminate();
    }
    
  } catch (error) {
    console.error('✗ Tesseract OCR failed:', error);
    
    return {
      success: false,
      ocrText: '',
      confidence: 0,
      fields: {},
      extractedFields: [],
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * 从OCR文本中提取发票字段
 */
function extractInvoiceFields(ocrText) {
  const fields = {};
  
  // 清理OCR文本：移除中文字符之间的空格，保留其他空格
  const cleanedText = cleanOCRText(ocrText);
  
  // 发票号码 - 多种格式，处理OCR空格（如 "发 票 号 码"）
  const invoiceNumberPatterns = [
    /发\s*票\s*号\s*码\s*[:：]\s*(\d{20})/,     // OCR空格 + 20位
    /发\s*票\s*号\s*码\s*[:：]\s*(\d+)/,        // OCR空格
    /发票号\s*码\s*[:：]\s*(\d{20})/,           // 20位数字
    /发票号\s*码\s*[:：]\s*(\d+)/,              // 可能分开
  ];
  for (const pattern of invoiceNumberPatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      fields.invoiceNumber = match[1];
      console.log('✅ Found invoiceNumber:', fields.invoiceNumber);
      break;
    }
  }
  
  // 发票代码 - 多种格式
  const invoiceCodePatterns = [
    /发票代码[:：]\s*(\d{10})/,           // 10位代码
    /发票代\s*码[:：]\s*(\w+)/,           // 可能分开
  ];
  for (const pattern of invoiceCodePatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      fields.invoiceCode = match[1];
      console.log('✅ Found invoiceCode:', fields.invoiceCode);
      break;
    }
  }
  
  // 发票日期 - 多种格式，处理OCR噪声
  const datePatterns = [
    /开\s*票\s*日\s*期.*?(\d{4}).*?(\d{1,2}).*?(\d{1,2})/,  // OCR空格 + 宽松匹配
    /开票日期\s*[:：]\s*(\d{4})[年]?\s*(\d{1,2})[月]?\s*(\d{1,2})/,           // 标准格式
  ];
  for (const pattern of datePatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      fields.invoiceDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      console.log('✅ Found invoiceDate:', fields.invoiceDate);
      break;
    }
  }
  
  // 销方名称
  const sellerPatterns = [
    /销方名称[:：]\s*([^\n]{2,40})/,
    /销售方名\s*称[:：]\s*([^\n]{2,40})/,
  ];
  for (const pattern of sellerPatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      fields.sellerName = match[1].replace(/\s+/g, '').trim();
      console.log('✅ Found sellerName:', fields.sellerName);
      break;
    }
  }
  
  // 销方税号
  const sellerTaxPatterns = [
    /销方税号[:：]\s*([A-Z0-9]{15,20})/i,
    /销方纳税人识别号[:：]\s*([A-Z0-9]{15,20})/i,
  ];
  for (const pattern of sellerTaxPatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      fields.sellerTaxNumber = match[1].toUpperCase();
      console.log('✅ Found sellerTaxNumber:', fields.sellerTaxNumber);
      break;
    }
  }
  
  // 购方名称
  const buyerPatterns = [
    /购方名称[:：]\s*([^\n]{2,40})/,
    /购买方名\s*称[:：]\s*([^\n]{2,40})/,
  ];
  for (const pattern of buyerPatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      fields.buyerName = match[1].replace(/\s+/g, '').trim();
      console.log('✅ Found buyerName:', fields.buyerName);
      break;
    }
  }
  
  // 购方税号
  const buyerTaxPatterns = [
    /购方税号[:：]\s*([A-Z0-9]{15,20})/i,
    /购方纳税人识别号[:：]\s*([A-Z0-9]{15,20})/i,
  ];
  for (const pattern of buyerTaxPatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      fields.buyerTaxNumber = match[1].toUpperCase();
      console.log('✅ Found buyerTaxNumber:', fields.buyerTaxNumber);
      break;
    }
  }
  
  // 价税合计（小写数字）- 处理OCR空格如 "879. 00"
  // 查找包含"合计"和"小写"的行
  const amountLine = cleanedText.split('\n').find(line => 
    line.includes('合计') && (line.includes('大写') || line.includes('小写'))
  );
  
  if (amountLine) {
    // 方法1: 直接匹配 "数字.数字" 格式
    const decimalMatch = amountLine.replace(/\s/g, '').match(/(\d+\.\d{1,2})/);
    if (decimalMatch) {
      fields.totalAmount = decimalMatch[1];
      console.log('✅ Found totalAmount:', fields.totalAmount);
    }
    
    // 方法2: 匹配 "数字. 数字" 格式（有空格）
    if (!fields.totalAmount) {
      const spacedMatch = amountLine.match(/(\d+)[.\s]+(\d{2})/);
      if (spacedMatch) {
        fields.totalAmount = spacedMatch[1] + '.' + spacedMatch[2];
        console.log('✅ Found totalAmount (spaced):', fields.totalAmount);
      }
    }
    
    // 提取大写金额 - 移除噪声后查找
    const cleanedLine = amountLine.replace(/\(.*?\)/g, '').replace(/[A-Za-z]/g, '');
    const chineseMatch = cleanedLine.match(/([零壹贰叁肆伍陆柒捌玖拾佰仟万亿]{1,6})\s*圆/);
    if (chineseMatch) {
      fields.totalAmountChinese = chineseMatch[1];
      console.log('✅ Found totalAmountChinese:', fields.totalAmountChinese);
    }
  }
  
  // 税额
  const taxPatterns = [
    /税额[:：]\s*[￥¥]?\s*(\d+(?:\.\d{1,2})?)/,
    /税\s*额[:：]\s*[￥¥]?\s*(\d+(?:\.\d{1,2})?)/,
  ];
  for (const pattern of taxPatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      fields.taxAmount = match[1].replace(/[￥¥\s,]/g, '');
      console.log('✅ Found taxAmount:', fields.taxAmount);
      break;
    }
  }
  
  // 校验码
  const checkCodePatterns = [
    /校验码[:：]\s*(\d{8,})/,
    /校\s*验\s*码[:：]\s*(\d{8,})/,
  ];
  for (const pattern of checkCodePatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      fields.checkCode = match[1];
      console.log('✅ Found checkCode:', fields.checkCode);
      break;
    }
  }
  
  // 提取项目明细（发票表格行）
  const items = extractInvoiceItems(cleanedText);
  if (items.length > 0) {
    fields.items = items;
    console.log('✅ Found items:', items.length, 'items');
    
    // 计算总额（价税合计 = 项目金额 + 税额）
    const totalSum = items.reduce((sum, item) => sum + (item.amount || 0) + (item.taxAmount || 0), 0);
    fields.totalSum = totalSum.toFixed(2);
    console.log('✅ Calculated totalSum (含税):', fields.totalSum);
  }
  
  console.log('📋 Extracted invoice fields:', fields);
  
  return fields;
}

/**
 * 从OCR文本中提取发票明细项目
 * 解析表格格式的项目名称、规格、单位、数量、单价、金额、税率、税额
 */
function extractInvoiceItems(ocrText) {
  const items = [];
  
  // 查找项目明细区域的起始标记（处理OCR空格如 "项 目 名 称"）
  const itemSectionMatch = ocrText.match(/项\s*目\s*名\s*称/);
  if (!itemSectionMatch) {
    return items;
  }
  
  // 获取项目区域（从"项目名称"到"合计"）
  const itemSectionStart = ocrText.indexOf(itemSectionMatch[0]);
  const hejiPos = ocrText.indexOf('合计', itemSectionStart);
  
  if (hejiPos === -1) {
    return items;
  }
  
  const itemSection = ocrText.substring(itemSectionStart, hejiPos);
  
  // 简单按换行分割
  const lines = itemSection.split('\n').filter(line => line.trim().length > 10);
  
  // 金额模式 - 处理OCR空格 (如 "829. 25" 或 "829.25")
  const moneyPattern = /(\d{1,10}(?:\.\d{1,2})?)/;
  // 税率模式 (如 "6%", "13%", "6 %")
  const taxRatePattern = /(\d{1,2})\s*%?/;
  
  for (const line of lines) {
    // 跳过标题行和合计行（处理OCR空格）
    const lineNoSpace = line.replace(/\s/g, '');
    if (lineNoSpace.includes('项目名称') || lineNoSpace.includes('规格型号') || 
        lineNoSpace.includes('单价') || lineNoSpace.includes('数量') ||
        lineNoSpace.includes('合计')) {
      continue;
    }
    
    // 清理行中的空格
    const cleanedLine = line.replace(/\s+/g, ' ').trim();
    
    // 修复OCR数字空格问题: "829. 25" -> "829.25", "49. 75" -> "49.75"
    const fixedLine = cleanedLine.replace(/(\d+)\.\s+(\d)/g, '$1.$2');
    
    // 提取金额
    const moneyMatches = fixedLine.match(/(\d+\.?\d*)/g);
    if (!moneyMatches || moneyMatches.length < 1) {
      continue;
    }
    
    // 提取项目名称 - 到第一个数字为止
    const nameMatch = cleanedLine.match(/^([^\d]+)/);
    let itemName = nameMatch ? nameMatch[1] : '';
    
    // 清理项目名称
    itemName = itemName.replace(/^[\s\*\-\.]+|\s*[\s\*\-\.]+$/g, '').trim();
    
    if (itemName.length < 2) {
      continue;
    }
    
    // 提取金额（通常倒数第二或第三个数值）
    const amounts = moneyMatches.map(m => parseFloat(m)).filter(n => !isNaN(n));
    
    let unitPrice = null;
    let quantity = null;
    let amount = null;
    let taxRate = null;
    let taxAmount = null;
    
    // 分析数字序列来判断字段 - 不计算税率，只提取原始值
    if (amounts.length >= 2) {
      // 常见格式: 数量 单价 金额 ...
      if (amounts.length >= 3) {
        quantity = amounts[0];
        unitPrice = amounts[1];
        amount = amounts[2];
        taxAmount = amounts[amounts.length - 1]; // 最后一个通常是税额
      } else if (amounts.length === 2) {
        amount = amounts[0];
        taxAmount = amounts[1];
      }
    }
    
    // 提取税率（从带 % 的格式中提取，如 "6%"）
    const taxRateMatch = line.match(/(\d{1,2})\s*%/);
    if (taxRateMatch) {
      taxRate = parseFloat(taxRateMatch[1]) / 100; // 转换为小数 6% -> 0.06
    }
    
    // 计算金额（如果没找到但有单价和数量）
    if (!amount && unitPrice && quantity) {
      amount = unitPrice * quantity;
    }
    
    // 如果有金额但没有单价和数量，可以尝试估算
    if (!unitPrice && amount && !quantity) {
      unitPrice = amount;
      quantity = 1;
    }
    
    if (itemName && amount) {
      items.push({
        name: itemName,
        quantity: quantity,
        unitPrice: unitPrice,
        amount: amount,
        taxRate: taxRate,
        taxAmount: taxAmount
      });
    }
  }
  
  return items;
}

/**
 * 清理OCR文本：移除中文字符之间的多余空格
 * 同时移除常见的OCR噪声字符
 */
function cleanOCRText(text) {
  if (!text) return '';
  
  // 移除常见的OCR噪声字符
  const noisePatterns = [
    /回味润回/g,           // OCR误识别
    /这、/g,               // 标点噪声
    /王AI瑟Re/gi,          // 英文噪声
    /电子发双票/gi,        // 误识别
    /[|]/g,                // 竖线噪声
    /_+/g,                 // 下划线噪声
    /~+/g,                 // 波浪号噪声
  ];
  
  let cleaned = text;
  noisePatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // 移除连续空格
  cleaned = cleaned.replace(/ {2,}/g, ' ');
  
  // 移除每行开头和结尾的空格
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  
  // 移除空行
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned;
}

module.exports = router;