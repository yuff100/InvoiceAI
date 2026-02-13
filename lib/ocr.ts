import { qiniuOCRService } from './qiniu-ocr';

interface OCRResult {
  success: boolean;
  data?: any;
  error?: string;
  confidence?: number;
}

export class CloudOCRService {
  private qiniuOCR = qiniuOCRService;
  
  async extractInvoiceInfo(imageUrl: string): Promise<OCRResult> {
    try {
      const result = await this.qiniuOCR.recognizeInvoice(imageUrl);
      
      if (result.success) {
        return result;
      }
      
      throw new Error('OCR识别失败');
      
    } catch (error) {
      console.error('OCR识别失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OCR处理失败，请稍后重试'
      };
    }
  }
}

export const ocrService = new CloudOCRService();

export const triggerOCR = async (params: {
  fileUrl: string;
  fileName: string;
  taskId: string;
  timestamp?: number;
}) => {
  const result = await ocrService.extractInvoiceInfo(params.fileUrl);
  console.log('OCR处理完成:', result);
  
  return result;
};