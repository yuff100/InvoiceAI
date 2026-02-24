// 发票项目明细
export interface InvoiceItem {
  name: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
}

// 发票数据类型
export interface InvoiceFields {
  invoiceCode?: string;      // 发票代码
  invoiceNumber?: string;    // 发票号码
  invoiceDate?: string;      // 开票日期
  sellerName?: string;        // 销方名称
  sellerTaxNumber?: string;  // 销方税号
  buyerName?: string;        // 购方名称
  buyerTaxNumber?: string;   // 购方税号
  totalAmount?: string;      // 价税合计
  taxAmount?: string;        // 税额
  totalSum?: string;         // 总额（不含税金额合计）
  checkCode?: string;        // 校验码
  confidence?: number;       // 置信度
  items?: InvoiceItem[];     // 项目明细
}

// 发票处理状态
export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

// 处理记录
export interface ProcessingRecord {
  id: string;
  batchId?: string;          // 批次ID，用于分组多文件上传
  fileName: string;
  fileUrl?: string;
  uploadTime: string;
  status: ProcessingStatus;
  ocrResult?: InvoiceFields;
  oaPushResults?: PushResult[];
  error?: string;
  progress?: number;
  files?: {
    id: string;
    name: string;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    progress?: number;
  }[];
}

// 批次记录
export interface BatchRecord {
  batchId: string;
  uploadTime: string;
  files: ProcessingRecord[];
  status: ProcessingStatus;
}

// 文件处理结果
export interface ProcessedImage {
  file: File;
  name: string;
  size: number;
  type: string;
}

// 上传签名响应
export interface UploadSignature {
  token: string;
  key: string;
  uploadUrl: string;
  fileUrl: string;
  downloadUrl?: string;
}

// OCR处理结果
export interface OCRResult {
  success: boolean;
  data?: InvoiceFields;
  error?: string;
  confidence?: number;
}

// 推送结果
export interface PushResult {
  success: boolean;
  messageId?: string;
  status: 'success' | 'failed';
  error?: string;
  oaType: string;
}