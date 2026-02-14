// 智谱GLM-OCR服务
// 文档: https://docs.bigmodel.cn/cn/guide/models/vlm/glm-ocr

interface InvoiceFields {
    invoiceCode?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    sellerName?: string;
    sellerTaxNumber?: string;
    buyerName?: string;
    buyerTaxNumber?: string;
    totalAmount?: string;
    totalSum?: string;
    taxAmount?: string;
    taxRate?: string;
    checkCode?: string;
    items?: InvoiceItem[];
    confidence?: number;
}

interface InvoiceItem {
    name: string;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
    taxRate?: string;
    taxAmount?: number;
}

interface OCRResult {
    success: boolean;
    data?: InvoiceFields;
    error?: string;
    confidence?: number;
    rawText?: string;
}

// 发票识别专用prompt
const INVOICE_PROMPT = `请按下列JSON格式输出图中发票信息，不要输出其他内容:
{
    "invoiceCode": "发票代码",
    "invoiceNumber": "发票号码",
    "invoiceDate": "开票日期(格式: YYYY-MM-DD)",
    "sellerName": "销售方名称",
    "sellerTaxNumber": "销售方纳税人识别号",
    "buyerName": "购买方名称",
    "buyerTaxNumber": "购买方纳税人识别号",
    "totalSum": "金额合计(不含税)",
    "taxAmount": "税额合计",
    "totalAmount": "价税合计",
    "items": [
        {
            "name": "项目名称",
            "quantity": "数量",
            "unitPrice": "单价",
            "amount": "金额",
            "taxRate": "税率",
            "taxAmount": "税额"
        }
    ],
    "checkCode": "校验码"
}`;

export class ZhipuOCRService {
    private apiKey: string;
    private apiUrl = 'https://open.bigmodel.cn/api/paas/v4/layout_parsing';
    private model = 'glm-ocr'; // 使用智谱专用 OCR 模型

    constructor() {
        this.apiKey = process.env.ZHIPU_API_KEY || '';
    }

    // 发票识别
    async recognizeInvoice(imageUrl: string): Promise<OCRResult> {
        if (!this.apiKey) {
            return {
                success: false,
                error: '智谱API Key未配置，请在环境变量中设置 ZHIPU_API_KEY'
            };
        }

        try {
            console.log('🚀 ZhipuOCR: Starting invoice recognition...');
            console.log('📷 Image URL:', imageUrl);

            // 下载图片并转为 base64
            console.log('📥 Downloading image...');
            const imageResponse = await fetch(imageUrl);
            
            if (!imageResponse.ok) {
                throw new Error(`Failed to download image: ${imageResponse.status}`);
            }

            const buffer = await imageResponse.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            
            // 检测图片格式
            const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
            let mimeType = 'image/jpeg';
            
            if (contentType.includes('png')) {
                mimeType = 'image/png';
            } else if (contentType.includes('jpg') || contentType.includes('jpeg')) {
                mimeType = 'image/jpeg';
            }

            console.log('✅ Image downloaded:', buffer.byteLength, 'bytes');

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.apiKey
                },
                body: JSON.stringify({
                    model: this.model,
                    file: `data:${mimeType};base64,${base64}`
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ ZhipuOCR API error:', response.status, errorText);
                throw new Error(`智谱API错误: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('📥 ZhipuOCR: Recognition completed');

            // glm-ocr 返回的是文档解析结果，包含 md_results 字段
            if (result.md_results) {
                const mdText = result.md_results;
                console.log('📄 Markdown result length:', mdText.length);
                return this.parseMarkdownResponse(mdText);
            }

            throw new Error('智谱API返回格式异常');

        } catch (error) {
            console.error('❌ ZhipuOCR识别失败:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '智谱OCR处理失败'
            };
        }
    }

    // 从 Markdown 文本中解析发票信息
    private parseMarkdownResponse(mdText: string): OCRResult {
        try {
            console.log('📄 Parsing markdown text...');
            console.log('📄 Full markdown:', mdText);

            // 提取合计行的两个金额：合计¥394.06¥3.94
            const amountMatch = mdText.match(/合计[¥￥\$]*([\d.,]+)[¥￥\$]*([\d.,]+)/);
            const totalSum = amountMatch ? amountMatch[1] : '';
            const taxAmount = amountMatch ? amountMatch[2] : '';
            console.log('💰 Amount match:', { totalSum, taxAmount, match: amountMatch });

            // 提取价税合计：从"小写）¥398.00"中提取
            const totalAmountMatch = mdText.match(/小写[）\)][¥￥\$]+([\d.,]+)/) || mdText.match(/价税合计[\s\S]*?[¥￥\$]+([\d.,]+)/);
            const totalAmount = totalAmountMatch ? totalAmountMatch[1] : '';
            console.log('💰 Total amount match:', { totalAmount, match: totalAmountMatch });

            // 从 markdown 中提取发票信息
            const invoiceData: InvoiceFields = {
                invoiceCode: '',
                invoiceNumber: this.extractField(mdText, /发票号码[：:]([\d]+)/),
                invoiceDate: this.normalizeDate(this.extractField(mdText, /开票日期[：:]([\d年月日]+)/)),
                sellerName: this.extractField(mdText, /销售方信息[\s\S]*?名称[：:]([^\n统]+)/),
                sellerTaxNumber: this.extractField(mdText, /销售方[\s\S]*?统一社会信用代码\/纳税人识别号[：:]([A-Z0-9]+)/),
                buyerName: this.extractField(mdText, /购买方信息[\s\S]*?名称[：:]([^\n统]+)/),
                buyerTaxNumber: this.extractField(mdText, /购买方[\s\S]*?统一社会信用代码\/纳税人识别号[：:]([A-Z0-9]+)/),
                totalSum: this.cleanAmount(totalSum),
                taxAmount: this.cleanAmount(taxAmount),
                totalAmount: this.cleanAmount(totalAmount),
                checkCode: '',
                items: [],
                confidence: 0
            };

            invoiceData.confidence = this.calculateConfidence(invoiceData);

            console.log('✅ Extracted invoice data:', invoiceData);

            return {
                success: true,
                data: invoiceData,
                confidence: invoiceData.confidence,
                rawText: mdText
            };

        } catch (error) {
            console.error('❌ 解析 Markdown 失败:', error);
            return {
                success: false,
                error: '解析发票数据失败',
                rawText: mdText
            };
        }
    }

    // 提取字段
    private extractField(text: string, regex: RegExp): string {
        const match = text.match(regex);
        return match ? match[1].trim() : '';
    }

    // 解析智谱返回的发票信息
    private parseInvoiceResponse(content: string): OCRResult {
        try {
            // 尝试从返回内容中提取JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return {
                    success: false,
                    error: '无法从返回内容中提取JSON',
                    rawText: content
                };
            }

            const data = JSON.parse(jsonMatch[0]);
            
            // 标准化字段
            const fields: InvoiceFields = {
                invoiceCode: data.invoiceCode || data['发票代码'] || '',
                invoiceNumber: data.invoiceNumber || data['发票号码'] || '',
                invoiceDate: this.normalizeDate(data.invoiceDate || data['开票日期'] || ''),
                sellerName: data.sellerName || data['销售方名称'] || '',
                sellerTaxNumber: data.sellerTaxNumber || data['销售方纳税人识别号'] || '',
                buyerName: data.buyerName || data['购买方名称'] || '',
                buyerTaxNumber: data.buyerTaxNumber || data['购买方纳税人识别号'] || '',
                totalSum: this.cleanAmount(data.totalSum || data['金额合计'] || data['合计金额'] || ''),
                taxAmount: this.cleanAmount(data.taxAmount || data['税额合计'] || data['合计税额'] || ''),
                totalAmount: this.cleanAmount(data.totalAmount || data['价税合计'] || data['合计金额'] || ''),
                checkCode: data.checkCode || data['校验码'] || '',
                items: this.parseItems(data.items || data['项目明细'] || []),
                confidence: this.calculateConfidence(data)
            };

            return {
                success: true,
                data: fields,
                confidence: fields.confidence,
                rawText: content
            };

        } catch (error) {
            console.error('❌ 解析发票JSON失败:', error);
            return {
                success: false,
                error: '解析发票数据失败',
                rawText: content
            };
        }
    }

    // 解析发票明细项
    private parseItems(items: any[]): InvoiceItem[] {
        if (!Array.isArray(items)) return [];
        
        return items.map(item => ({
            name: item.name || item['项目名称'] || item['货物或应税劳务、服务名称'] || '',
            quantity: parseFloat(item.quantity || item['数量'] || '0') || undefined,
            unitPrice: parseFloat(item.unitPrice || item['单价'] || '0') || undefined,
            amount: parseFloat(this.cleanAmount(item.amount || item['金额'] || '0')) || undefined,
            taxRate: item.taxRate || item['税率'] || '',
            taxAmount: parseFloat(this.cleanAmount(item.taxAmount || item['税额'] || '0')) || undefined
        })).filter(item => item.name);
    }

    // 标准化日期格式
    private normalizeDate(dateStr: string): string {
        if (!dateStr) return '';

        // 已经是标准格式
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }

        // 中文日期格式
        const cnMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (cnMatch) {
            return `${cnMatch[1]}-${cnMatch[2].padStart(2, '0')}-${cnMatch[3].padStart(2, '0')}`;
        }

        // 纯数字格式
        const numMatch = dateStr.match(/(\d{4})(\d{2})(\d{2})/);
        if (numMatch) {
            return `${numMatch[1]}-${numMatch[2]}-${numMatch[3]}`;
        }

        // 其他分隔符格式
        const sepMatch = dateStr.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
        if (sepMatch) {
            return `${sepMatch[1]}-${sepMatch[2].padStart(2, '0')}-${sepMatch[3].padStart(2, '0')}`;
        }

        return dateStr;
    }

    // 清理金额字符串
    private cleanAmount(amount: string): string {
        if (!amount) return '';
        // 移除货币符号和逗号
        return amount.toString().replace(/[¥￥,，\s]/g, '').trim();
    }

    // 计算置信度
    private calculateConfidence(data: any): number {
        const keyFields = [
            'invoiceCode', 'invoiceNumber', 'invoiceDate',
            'sellerName', 'sellerTaxNumber', 'buyerName',
            'totalAmount'
        ];

        const validFields = keyFields.filter(field => {
            const value = data[field];
            return value && String(value).trim().length > 0;
        });

        return Math.round((validFields.length / keyFields.length) * 100) / 100;
    }

    // 字段映射
    private fieldMapping(field: string): string {
        const mapping: Record<string, string> = {
            invoiceCode: '发票代码',
            invoiceNumber: '发票号码',
            invoiceDate: '开票日期',
            sellerName: '销售方名称',
            sellerTaxNumber: '销售方纳税人识别号',
            buyerName: '购买方名称',
            totalAmount: '价税合计'
        };
        return mapping[field] || field;
    }
}

// 导出单例
export const zhipuOCRService = new ZhipuOCRService();
