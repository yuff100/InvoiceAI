import * as XLSX from 'xlsx';
import type { ProcessingRecord, InvoiceFields, InvoiceItem } from '../types/invoice';

function formatItems(items?: InvoiceItem[]): string {
  if (!items || items.length === 0) return '';
  return items.map((item, idx) => 
    `${idx + 1}. ${item.name} (金额:${item.amount}${item.taxAmount ? ',税额:' + item.taxAmount : ''})`
  ).join('; ');
}

export function exportToExcel(records: ProcessingRecord[]): void {
  if (!records || records.length === 0) {
    throw new Error('没有可导出的数据');
  }

  const data = records.map((record, index) => {
    const ocr = record.ocrResult;
    return {
      '序号': index + 1,
      '文件名': record.fileName,
      '处理状态': getStatusText(record.status),
      '发票代码': ocr?.invoiceCode || '',
      '发票号码': ocr?.invoiceNumber || '',
      '开票日期': ocr?.invoiceDate || '',
      '销方名称': ocr?.sellerName || '',
      '销方税号': ocr?.sellerTaxNumber || '',
      '购方名称': ocr?.buyerName || '',
      '购方税号': ocr?.buyerTaxNumber || '',
      '价税合计': ocr?.totalAmount || '',
      '税额': ocr?.taxAmount || '',
      '校验码': ocr?.checkCode || '',
      '识别置信度': ocr?.confidence ? `${(ocr.confidence * 100).toFixed(2)}%` : '',
      '项目明细': formatItems(ocr?.items),
      '处理时间': record.uploadTime,
      '错误信息': record.error || '',
    };
  });

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(data);
  
  const colWidths: Record<string, number> = {
    'A': 8,
    'B': 25,
    'C': 12,
    'D': 15,
    'E': 22,
    'F': 12,
    'G': 30,
    'H': 20,
    'I': 30,
    'J': 20,
    'K': 12,
    'L': 12,
    'M': 20,
    'N': 12,
    'O': 50,
    'P': 20,
    'Q': 30,
  };
  
  ws['!cols'] = Object.keys(colWidths).map(key => ({ wch: colWidths[key] }));
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '发票数据');
  
  // 生成文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `发票数据_${timestamp}.xlsx`;
  
  // 下载文件
  XLSX.writeFile(wb, fileName);
}

/**
 * 导出单条记录为Excel
 */
export function exportSingleRecord(record: ProcessingRecord): void {
  exportToExcel([record]);
}

/**
 * 获取状态文本
 */
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'idle': '等待中',
    'uploading': '上传中',
    'processing': '识别中',
    'completed': '已完成',
    'failed': '失败',
  };
  return statusMap[status] || status;
}

/**
 * 导出为CSV格式（备用）
 */
export function exportToCSV(records: ProcessingRecord[]): void {
  if (!records || records.length === 0) {
    throw new Error('没有可导出的数据');
  }

  const headers = [
    '序号',
    '文件名',
    '处理状态',
    '发票代码',
    '发票号码',
    '开票日期',
    '销方名称',
    '销方税号',
    '购方名称',
    '购方税号',
    '价税合计',
    '税额',
    '校验码',
    '识别置信度',
    '项目明细',
    '处理时间',
    '错误信息',
  ];

  const rows = records.map((record, index) => {
    const ocr = record.ocrResult;
    return [
      index + 1,
      record.fileName,
      getStatusText(record.status),
      ocr?.invoiceCode || '',
      ocr?.invoiceNumber || '',
      ocr?.invoiceDate || '',
      ocr?.sellerName || '',
      ocr?.sellerTaxNumber || '',
      ocr?.buyerName || '',
      ocr?.buyerTaxNumber || '',
      ocr?.totalAmount || '',
      ocr?.taxAmount || '',
      ocr?.checkCode || '',
      ocr?.confidence ? `${(ocr.confidence * 100).toFixed(2)}%` : '',
      formatItems(ocr?.items),
      record.uploadTime,
      record.error || '',
    ];
  });

  // 构建CSV内容
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => {
        // 处理包含逗号或引号的单元格
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ),
  ].join('\n');

  // 添加BOM以支持中文
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // 下载
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  link.href = URL.createObjectURL(blob);
  link.download = `发票数据_${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
