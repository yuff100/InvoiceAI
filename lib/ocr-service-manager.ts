// OCR服务管理器 - 浏览器版本
export class OCRServiceManager {
  private currentProvider: string = 'tesseract'; // 默认使用Tesseract
  private providers = {
    qiniu: {
      name: '七牛云OCR',
      apiUrl: 'https://api.qiniu.com/vs/vat/invoice',
      auth: () => this.getQiniuAuth()
    },
    tesseract: {
      name: 'Tesseract OCR',
      apiUrl: '/api/tesseract/ocr',
      auth: () => 'open'
    }
  };

  // 获取当前认证信息
  private getQiniuAuth() {
    // 在浏览器中无法访问环境变量，返回null
    return null;
  }

  // 切换OCR提供商
  switchProvider(provider: string) {
    if (!this.providers[provider as keyof typeof this.providers]) {
      throw new Error(`不支持的OCR提供商: ${provider}`);
    }
    this.currentProvider = provider;
    console.log(`🔄 Switched to ${this.providers[provider as keyof typeof this.providers].name} OCR`);
    
    return this.providers[provider as keyof typeof this.providers].auth();
  }

  // 获取当前OCR服务
  getCurrentProvider() {
    return this.providers[this.currentProvider as keyof typeof this.providers];
  }

  // 使用OCR识别发票
  async recognizeInvoice(imageUrl: string, provider?: string) {
    const providerName = provider || this.currentProvider;
    const auth = this.switchProvider(providerName);
    
    if (!auth && providerName === 'qiniu') {
      throw new Error('七牛云OCR凭证未配置');
    }
    
    if (providerName === 'tesseract') {
      return await this.recognizeWithTesseract(imageUrl);
    }
    
    throw new Error('暂只支持Tesseract OCR');
  }

  // Tesseract OCR识别
  private async recognizeWithTesseract(imageUrl: string) {
    console.log('🔥 Using Tesseract OCR for:', imageUrl);
    
    try {
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
        throw new Error(`Tesseract OCR error: ${response.status}`);
      }

      const result = await response.json();
      console.log('📥 Tesseract response:', result);
      
      return result;
    } catch (error) {
      console.error('Tesseract OCR error:', error);
      throw error;
    }
  }
}

export const ocrServiceManager = new OCRServiceManager();