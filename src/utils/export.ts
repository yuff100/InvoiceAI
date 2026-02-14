import * as XLSX from 'xlsx';
import type { ProcessingRecord, InvoiceFields, InvoiceItem } from '../types/invoice';

const MAX_ITEMS = 5;

function generateItemColumns(items?: InvoiceItem[]): Record<string, string | number> {
  const columns: Record<string, string | number> = {};
  
  if (!items || items.length === 0) {
    for (let i = 1; i <= MAX_ITEMS; i++) {
      columns[`项目名称${i}`] = '';
      columns[`金额${i}`] = '';
      columns[`税额${i}`] = '';
    }
    return columns;
  }
  
  items.slice(0, MAX_ITEMS).forEach((item, idx) => {
    const i = idx + 1;
    columns[`项目名称${i}`] = item.name || '';
    columns[`金额${i}`] = item.amount || '';
    columns[`税额${i}`] = item.taxAmount || '';
  });
  
  for (let i = items.length + 1; i <= MAX_ITEMS; i++) {
    columns[`项目名称${i}`] = '';
    columns[`金额${i}`] = '';
    columns[`税额${i}`] = '';
  }
  
  return columns;
}

export function exportToExcel(records: ProcessingRecord[]): void {
  if (!records || records.length === 0) {
    throw new Error('没有可导出的数据');
  }

  console.log('📊 Exporting records:', JSON.stringify(records, null, 2));

  const data = records.map((record, index) => {
    const ocr = record.ocrResult;
    console.log(`📊 Record ${index + 1} OCR Data:`, JSON.stringify(ocr, null, 2));
    const itemColumns = generateItemColumns(ocr?.items);
    
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
      '总额': ocr?.totalSum || '',
      '校验码': ocr?.checkCode || '',
      '识别置信度': ocr?.confidence ? `${(ocr.confidence * 100).toFixed(2)}%` : '',
      ...itemColumns,
      '处理时间': record.uploadTime,
      '错误信息': record.error || '',
    };
  });

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(data);
  
  const colWidths: Record<string, number> = {};
  const baseCols = {
    'A': 8, 'B': 25, 'C': 12, 'D': 15, 'E': 22, 'F': 12,
    'G': 30, 'H': 20, 'I': 30, 'J': 20, 'K': 12, 'L': 12, 'M': 12, 'N': 20, 'O': 12
  };
  Object.assign(colWidths, baseCols);
  
  const startIdx = 15;
  for (let i = 0; i < MAX_ITEMS * 3; i++) {
    const col = String.fromCharCode(65 + startIdx + i);
    colWidths[col] = (i % 3 === 0) ? 30 : 12;
  }

  const timeCol = String.fromCharCode(65 + startIdx + MAX_ITEMS * 3);
  const errorCol = String.fromCharCode(65 + startIdx + MAX_ITEMS * 3 + 1);
  colWidths[timeCol] = 20;
  colWidths[errorCol] = 30;
  
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
    '总额',
    '校验码',
    '识别置信度',
    ...Array.from({ length: MAX_ITEMS }, (_, i) => [`项目名称${i + 1}`, `金额${i + 1}`, `税额${i + 1}`]).flat(),
    '处理时间',
    '错误信息',
  ];

  const rows = records.map((record, index) => {
    const ocr = record.ocrResult;
    const itemColumns = generateItemColumns(ocr?.items);
    const itemValues = [];
    for (let i = 1; i <= MAX_ITEMS; i++) {
      itemValues.push(itemColumns[`项目名称${i}`], itemColumns[`金额${i}`], itemColumns[`税额${i}`]);
    }
    
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
      ocr?.totalSum || '',
      ocr?.checkCode || '',
      ocr?.confidence ? `${(ocr.confidence * 100).toFixed(2)}%` : '',
      ...itemValues,
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
