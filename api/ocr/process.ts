import type { VercelRequest, VercelResponse } from '@vercel/node';
import { triggerOCR } from '../../lib/ocr';

interface RequestBody {
    fileUrl: string;
    fileName: string;
    taskId: string;
    provider?: 'zhipu' | 'tesseract' | 'auto';
}

interface OCRResponse {
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

        const response: ApiResponse<{ ocrResult: OCRResponse }> = {
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
