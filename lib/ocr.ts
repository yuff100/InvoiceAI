import { zhipuOCRService } from './zhipu-ocr';

interface OCRResult {
    success: boolean;
    data?: any;
    error?: string;
    confidence?: number;
    rawText?: string;
}

type OCRProvider = 'zhipu' | 'tesseract' | 'auto';

export class CloudOCRService {
    private defaultProvider: OCRProvider;
    private tesseractApiUrl: string;

    constructor() {
        const envProvider = process.env.OCR_PROVIDER as OCRProvider;
        if (envProvider && ['zhipu', 'tesseract', 'auto'].includes(envProvider)) {
            this.defaultProvider = envProvider;
        } else {
            this.defaultProvider = 'auto';
        }
        this.tesseractApiUrl = process.env.TESSERACT_API_URL || 'http://localhost:3001/api/tesseract/ocr';
    }

    async extractInvoiceInfo(imageUrl: string, provider?: OCRProvider): Promise<OCRResult> {
        const useProvider = provider || this.defaultProvider;

        if (useProvider === 'auto') {
            return this.autoRecognize(imageUrl);
        }

        return this.recognizeWithProvider(imageUrl, useProvider);
    }

    private async autoRecognize(imageUrl: string): Promise<OCRResult> {
        const providers: OCRProvider[] = ['zhipu', 'tesseract'];
        
        for (const provider of providers) {
            try {
                console.log(`🔄 Trying OCR provider: ${provider}`);
                const result = await this.recognizeWithProvider(imageUrl, provider);
                
                if (result.success) {
                    console.log(`✅ OCR succeeded with ${provider}, confidence: ${result.confidence}`);
                    return result;
                }
                
                console.log(`⚠️ OCR with ${provider} failed: ${result.error}`);
            } catch (error) {
                console.log(`❌ OCR with ${provider} error:`, error);
            }
        }

        return {
            success: false,
            error: '所有OCR服务均识别失败'
        };
    }

    private async recognizeWithProvider(imageUrl: string, provider: OCRProvider): Promise<OCRResult> {
        switch (provider) {
            case 'zhipu':
                return zhipuOCRService.recognizeInvoice(imageUrl);
            
            case 'tesseract':
                return this.callTesseractOCR(imageUrl);
            
            default:
                throw new Error(`Unknown OCR provider: ${provider}`);
        }
    }

    private async callTesseractOCR(imageUrl: string): Promise<OCRResult> {
        try {
            console.log('🔥 Calling Tesseract OCR API:', this.tesseractApiUrl);
            
            const response = await fetch(this.tesseractApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileUrl: imageUrl,
                    extractFields: true
                })
            });

            if (!response.ok) {
                throw new Error(`Tesseract API error: ${response.status}`);
            }

            const result = await response.json();
            console.log('📥 Tesseract response:', result);

            if (result.success && result.data?.ocrResult) {
                const ocrData = result.data.ocrResult;
                return {
                    success: true,
                    data: ocrData.data || ocrData,
                    confidence: ocrData.confidence || 0.5,
                    rawText: ocrData.text || ''
                };
            }

            return {
                success: false,
                error: result.error || 'Tesseract识别失败'
            };

        } catch (error) {
            console.error('❌ Tesseract OCR failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Tesseract OCR调用失败'
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
    provider?: OCRProvider;
}) => {
    const result = await ocrService.extractInvoiceInfo(params.fileUrl, params.provider);
    console.log('OCR处理完成:', result);
    
    return result;
};