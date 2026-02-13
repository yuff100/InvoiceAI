// 导入OCR服务管理器 - 使用ES模块导入
import { ocrServiceManager } from '@/lib/ocr-service-manager';
import type { UploadSignature } from '@/types/invoice';

// 获取签名
export async function getUploadSignature(fileName: string): Promise<UploadSignature> {
  const response = await fetch('/api/qiniu/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName })
  });

  if (!response.ok) {
    throw new Error('获取上传签名失败');
  }

  return response.json();
}

// 完成上传并触发OCR - 使用Tesseract
export async function completeUpload(params: { fileUrl: string; fileName: string; taskId: string }) {
  const response = await fetch('/api/tesseract/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrl: params.fileUrl,
      extractFields: true
    })
  });

  if (!response.ok) {
    throw new Error(`OCR处理失败: ${response.status}`);
  }

  return response.json();
}

// 检查OCR服务状态
export function checkOCRService() {
  const provider = ocrServiceManager.getCurrentProvider();
  
  return {
    enabled: !!provider.auth(),
    provider: provider.name
  };
}

// 导出OCR服务管理器
export { ocrServiceManager };