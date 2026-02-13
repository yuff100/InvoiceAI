import * as qiniu from 'qiniu';

interface InvoiceFields {
  invoiceCode?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  sellerName?: string;
  sellerTaxNumber?: string;
  buyerName?: string;
  buyerTaxNumber?: string;
  totalAmount?: string;
  taxAmount?: string;
  checkCode?: string;
  confidence?: number;
}

interface OCRResult {
  success: boolean;
  data?: InvoiceFields;
  error?: string;
  confidence?: number;
}

// 七牛云智能多媒体服务
const mac = new qiniu.auth.digest.Mac(
  process.env.QINIU_ACCESS_KEY!,
  process.env.QINIU_SECRET_KEY!
);

const config = new qiniu.conf.Config();
// 华东区域
config.zone = qiniu.zone.Zone_z0;

const formUploader = new qiniu.form_up.FormUploader(config);
const putExtra = new qiniu.form_up.PutExtra();

// 七牛云OCR服务
export class QiniuOCRService {
  // 发票识别
  async recognizeInvoice(imageUrl: string): Promise<OCRResult> {
    try {
      // 七牛云发票OCR API
      const apiUrl = 'https://api.qiniu.com/vs/vat/ocr';
      
      const requestData = {
        data: {
          uri: imageUrl
        }
      };

      // 生成签名
      const accessToken = this.generateAccessToken(apiUrl, 'POST', JSON.stringify(requestData));
      
      // 发送请求
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
          data: this.normalizeFields(result.data),
          confidence: this.calculateConfidence(result.data)
        };
      } else {
        throw new Error(result.message || 'OCR识别失败');
      }
      
    } catch (error) {
      console.error('七牛云OCR失败:', error);
      return {
        success: false,
        error: error.message || 'OCR处理失败，请稍后重试'
      };
    }
  }

  // 生成访问令牌
  private generateAccessToken(url: string, method: string, body: string): string {
    const signingStr = `${url}\n${method}\n${body}\nHost: api.qiniu.com\nContent-Type:application/json`;
    return qiniu.util.generateAccessToken(mac, signingStr);
  }

  // 统一字段格式
  private normalizeFields(data: any): InvoiceFields {
    return {
      invoiceCode: data.InvoiceCode,
      invoiceNumber: data.InvoiceNum,
      invoiceDate: this.normalizeDate(data.InvoiceDate),
      sellerName: data.SellerName,
      sellerTaxNumber: data.SellerRegisterNum,
      buyerName: data.BuyerName,
      buyerTaxNumber: data.BuyerRegisterNum,
      totalAmount: data.TotalAmount,
      taxAmount: data.TotalTax,
      checkCode: data.CheckCode
    };
  }

  // 标准化日期格式
  private normalizeDate(dateStr: string): string {
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

  // 计算置信度
  private calculateConfidence(data: any): number {
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
}

// 导出单例
export const qiniuOCRService = new QiniuOCRService();