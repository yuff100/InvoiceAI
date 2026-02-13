interface RequestBody {
  fileUrl: string;
  fileName: string;
  taskId: string;
}

interface OCRResponse {
  success: boolean;
  data?: any;
  error?: string;
  confidence?: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: RequestBody = await req.json();
    const { fileUrl, fileName, taskId } = body;

    if (!fileUrl || !fileName || !taskId) {
      return new Response(
        JSON.stringify({ error: 'fileUrl, fileName, and taskId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const accessKey = process.env.QINIU_ACCESS_KEY;
    const secretKey = process.env.QINIU_SECRET_KEY;

    if (!accessKey || !secretKey) {
      return new Response(
        JSON.stringify({ error: 'Qiniu OCR credentials not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ocrResult = await callQiniuOCR(fileUrl, accessKey, secretKey);

    const response: ApiResponse<{ ocrResult: OCRResponse }> = {
      success: true,
      data: {
        ocrResult
      }
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OCR processing error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'OCR processing failed'
    };

    return new Response(
      JSON.stringify(response),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function callQiniuOCR(imageUrl: string, accessKey: string, secretKey: string): Promise<OCRResponse> {
  const apiUrl = 'https://api.qiniu.com/vs/vat/ocr';
  
  const requestData = {
    data: {
      uri: imageUrl
    }
  };

  const accessToken = generateAccessToken(apiUrl, 'POST', JSON.stringify(requestData), accessKey, secretKey);
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Qiniu ${accessToken}`
    },
    body: JSON.stringify(requestData)
  });

  const result = await response.json();

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

function generateAccessToken(url: string, method: string, body: string, accessKey: string, secretKey: string): string {
  const crypto = require('crypto');
  const signingStr = `${url}\n${method}\n${body}\nHost: api.qiniu.com\nContent-Type:application/json`;
  const encodedStr = Buffer.from(signingStr, 'utf8').toString('base64');
  const signature = crypto.createHmac('sha1', secretKey).update(encodedStr).digest('base64');
  return `${accessKey}:${signature}`;
}

function normalizeFields(data: any): any {
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

function normalizeDate(dateStr: string): string {
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

function calculateConfidence(data: any): number {
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