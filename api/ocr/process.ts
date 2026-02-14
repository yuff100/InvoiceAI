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

export default async function handler(req: Request, res: Response) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const body: RequestBody = await req.json();
        const { fileUrl, fileName, taskId, provider } = body;

        if (!fileUrl || !fileName || !taskId) {
            return new Response(
                JSON.stringify({ error: 'fileUrl, fileName, and taskId are required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
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