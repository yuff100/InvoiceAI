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

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: RequestBody = await req.json();
    const { imageUrl, extractFields = true } = body;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'imageUrl is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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

    return new Response(
      JSON.stringify(ocrResult),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Tesseract OCR error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Tesseract OCR处理失败'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
