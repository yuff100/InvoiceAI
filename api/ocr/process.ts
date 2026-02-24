import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RequestBody {
    fileUrl: string;
    fileName: string;
    taskId: string;
    provider?: 'zhipu' | 'tesseract' | 'auto';
}

interface OCRResult {
    success: boolean;
    data?: any;
    error?: string;
    confidence?: number;
    rawText?: string;
}

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method not allowed');
    }

    try {
        const { fileUrl, fileName, taskId, provider } = req.body as RequestBody;

        if (!fileUrl || !fileName || !taskId) {
            return res.status(400).json({ error: 'fileUrl, fileName, and taskId are required' });
        }

        const ocrResult = await triggerOCR({
            fileUrl,
            fileName,
            taskId,
            provider
        });

        const response: ApiResponse<{ ocrResult: OCRResult }> = {
            success: true,
            data: {
                ocrResult
            }
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error('OCR processing error:', error);
        
        const response: ApiResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'OCR processing failed'
        };

        return res.status(500).json(response);
    }
}

async function triggerOCR(params: {
    fileUrl: string;
    fileName: string;
    taskId: string;
    provider?: 'zhipu' | 'tesseract' | 'auto';
}): Promise<OCRResult> {
    const useProvider = params.provider || 'zhipu';
    
    if (useProvider === 'zhipu') {
        return zhipuOCR(params.fileUrl);
    }
    
    return {
        success: false,
        error: 'Tesseract provider not supported'
    };
}

async function zhipuOCR(imageUrl: string): Promise<OCRResult> {
    const apiKey = process.env.ZHIPU_API_KEY;
    const apiUrl = 'https://open.bigmodel.cn/api/paas/v4/layout_parsing';
    const model = 'glm-ocr';

    if (!apiKey) {
        return {
            success: false,
            error: '智谱API Key未配置'
        };
    }

    try {
        console.log('🚀 ZhipuOCR: Starting...');
        
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.status}`);
        }

        const buffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        const mimeType = contentType.includes('png') ? 'image/png' : 'image/jpeg';

        console.log('📥 Image downloaded:', buffer.byteLength, 'bytes');

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify({
                model: model,
                file: `data:${mimeType};base64,${base64}`
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ ZhipuOCR API error:', response.status, errorText);
            throw new Error(`智谱API错误: ${response.status}`);
        }

        const result = await response.json();
        console.log('📥 ZhipuOCR response received');

        if (result.md_results) {
            return {
                success: true,
                data: {
                    rawText: result.md_results
                },
                rawText: result.md_results
            };
        }

        return {
            success: false,
            error: '智谱API返回格式异常'
        };

    } catch (error) {
        console.error('❌ ZhipuOCR failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '智谱OCR处理失败'
        };
    }
}
