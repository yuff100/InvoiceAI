import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RequestBody {
    fileUrl: string;
    fileName: string;
    taskId: string;
    provider?: 'zhipu' | 'tesseract' | 'auto';
}

interface OCRResult {
    success: boolean;
    data?: InvoiceFields;
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
            // 解析 md_results 为 InvoiceFields
            const invoiceData = parseMarkdownToInvoiceFields(result.md_results);
            
            return {
                success: true,
                data: invoiceData,
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

// 解析 markdown 为发票字段
function parseMarkdownToInvoiceFields(mdText: string): InvoiceFields {
    const data: InvoiceFields = {
        invoiceCode: '',
        invoiceNumber: '',
        invoiceDate: '',
        sellerName: '',
        sellerTaxNumber: '',
        buyerName: '',
        buyerTaxNumber: '',
        totalAmount: '',
        taxAmount: '',
        totalSum: '',
        checkCode: '',
        confidence: 0,
        items: []
    };

    try {
        // 提取合计行的两个金额：合计¥394.06¥3.94
        const amountMatch = mdText.match(/合计[¥￥\$]*([\d.,]+)[¥￥\$]*([\d.,]+)/);
        if (amountMatch) {
            data.totalSum = amountMatch[1];
            data.taxAmount = amountMatch[2];
            data.totalAmount = (parseFloat(amountMatch[1]) + parseFloat(amountMatch[2])).toString();
        }

        // 提取价税合计：从"小写）¥398.00"中提取
        const totalAmountMatch = mdText.match(/小写[）\)][¥￥\$]+([\d.,]+)/) || mdText.match(/价税合计[\s\S]*?[¥￥\$]+([\d.,]+)/);
        if (totalAmountMatch) {
            data.totalAmount = totalAmountMatch[1];
        }

        // 从 markdown 中提取发票信息
        data.invoiceCode = extractField(mdText, /发票号码[：:]([\d]+)/);
        data.invoiceNumber = extractField(mdText, /发票号码[：:]([\d]+)/);
        data.invoiceDate = normalizeDate(extractField(mdText, /开票日期[：:]([\d年月日]+)/));
        data.sellerName = extractField(mdText, /销售方信息[\s\S]*?名称[：:]([^\n统]+)/);
        data.sellerTaxNumber = extractField(mdText, /销售方[\s\S]*?统一社会信用代码\/纳税人识别号[：:]([A-Z0-9]+)/);
        data.buyerName = extractField(mdText, /购买方信息[\s\S]*?名称[：:]([^\n统]+)/);
        data.buyerTaxNumber = extractField(mdText, /购买方[\s\S]*?统一社会信用代码\/纳税人识别号[：:]([A-Z0-9]+)/);
        data.checkCode = '';

        // 计算置信度
        const keyFields = ['invoiceCode', 'invoiceNumber', 'invoiceDate', 'sellerName', 'buyerName', 'totalAmount'];
        const validFields = keyFields.filter(field => {
            const value = data[field];
            return value && String(value).trim().length > 0;
        });
        data.confidence = Math.round((validFields.length / keyFields.length) * 100) / 100;

        console.log('✅ Parsed invoice data:', data);
        
    } catch (error) {
        console.error('❌ Parse error:', error);
    }

    return data;
}

// 提取字段
function extractField(text: string, regex: RegExp): string {
    const match = text.match(regex);
    return match ? match[1].trim() : '';
}

// 解析日期
function normalizeDate(dateStr: string): string {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    const cnMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (cnMatch) return `${cnMatch[1]}-${cnMatch[2].padStart(2, '0')}-${cnMatch[3].padStart(2, '0')}`;
    
    const numMatch = dateStr.match(/(\d{4})(\d{2})(\d{2})/);
    if (numMatch) return `${numMatch[1]}-${numMatch[2]}-${numMatch[3]}`;
    
    return dateStr;
}
