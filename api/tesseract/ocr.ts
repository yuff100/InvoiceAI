import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface RequestBody {
  imageUrl: string;
  extractFields?: boolean;
}

export interface OCRResult {
  success: boolean;
  data?: any;
  error?: string;
  text?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const { imageUrl, extractFields = true } = req.body as RequestBody;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    // 这里应该调用实际的Tesseract OCR服务
    // 由于我们是在Vercel环境中，需要实现Tesseract服务或使用其他OCR服务
    // 目前使用模拟响应，实际部署时需要实现真实的Tesseract调用
    
    const ocrResult: OCRResult = {
      success: true,
      data: {
        text: '模拟OCR识别结果：\n发票代码：123456789012\n发票号码：9876543210\n开票日期：2023-01-01\n销售方：测试公司\n购买方：测试客户\n金额：1000.00\n税额：80.00\n价税合计：1080.00'
      }
    };

    return res.status(200).json(ocrResult);
  } catch (error) {
    console.error('Tesseract OCR error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Tesseract OCR处理失败'
    });
  }
}
