import { createWorker } from 'tesseract.js';

/**
 * 识别发票图像中的文本和字段
 * @param imageUrlOrBase64 图片URL或base64数据
 * @returns OCR识别结果
 */
export async function recognizeInvoiceFromImage(imageUrlOrBase64: string): Promise<{
  success: boolean;
  ocrText: string;
  confidence: number;
  fields: Record<string, string>;
  extractedFields: Array<{
    field: string;
    value: string;
    confidence: number;
  }>;
  processingTime: number;
}> {
  const startTime = Date.now();
  
  try {
    console.log('🔥 Starting Tesseract OCR recognition...');
    
    // 创建Tesseract worker
    const worker = await createWorker('chi_sim');
    
    try {
      // 进行OCR识别
      const { data: { text, confidence } } = await worker.recognize(imageUrlOrBase64);
      
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
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        ocrText: text,
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
 * @param ocrText OCR识别的文本
 * @returns 提取的字段
 */
export function extractInvoiceFields(ocrText: string): Record<string, string> {
  const fields: Record<string, string> = {};
  
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
    fields.invoiceDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
  }
  
  // 销方名称
  const sellerMatch = ocrText.match(/销方名称[：:\s]*([^\n：:]*?)(?=\n|$)/);
  if (sellerMatch) {
    fields.sellerName = sellerMatch[1].trim();
  }
  
  // 购方名称
  const buyerMatch = ocrText.match(/购方名称[：:\s]*([^\n：:]*?)(?=\n|$)/);
  if (buyerMatch) {
    fields.buyerName = buyerMatch[1].trim();
  }
  
  // 纳税人识别号
  const taxNumberMatch = ocrText.match(/纳税人识别号[:：\s]*([A-Z0-9]{15,20})/);
  if (taxNumberMatch) {
    fields.taxNumber = taxNumberMatch[1];
  }
  
  // 价税合计
  const amountMatch = ocrText.match(/价税合计[：:\s]*([￥¥]?\s*\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (amountMatch) {
    fields.totalAmount = amountMatch[1].replace(/[￥¥\s,]/g, '');
  }
  
  // 校验码
  const checkCodeMatch = ocrText.match(/校验码[：:\s]*(\d{8,})/);
  if (checkCodeMatch) {
    fields.checkCode = checkCodeMatch[1];
  }
  
  // 不含税金额
  const excludeTaxMatch = ocrText.match(/不含税金额[：:\s]*([￥¥]?\s*\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (excludeTaxMatch) {
    fields.excludeTaxAmount = excludeTaxMatch[1].replace(/[￥¥\s,]/g, '');
  }
  
  // 税额
  const taxAmountMatch = ocrText.match(/税额[：:\s]*([￥¥]?\s*\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (taxAmountMatch) {
    fields.taxAmount = taxAmountMatch[1].replace(/[￥¥\s,]/g, '');
  }
  
  console.log('📋 Extracted invoice fields:', fields);
  
  return fields;
}

/**
 * 调用Tesseract OCR API服务
 * @param imageUrl 图片URL
 * @returns OCR识别结果
 */
export async function callTesseractOCRService(imageUrl: string): Promise<any> {
  try {
    console.log('🌐 Calling Tesseract OCR API for:', imageUrl);
    
    const response = await fetch('/api/tesseract/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        extractFields: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Tesseract API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✓ Tesseract API response received:', result);
    
    return result.data || result;
    
  } catch (error) {
    console.error('✗ Tesseract OCR API call failed:', error);
    throw error;
  }
}