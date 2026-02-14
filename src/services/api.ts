import type { UploadSignature } from '@/types/invoice';

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

export async function completeUpload(params: {
  fileUrl?: string;
  fileName: string;
  taskId: string;
  provider?: 'zhipu' | 'tesseract' | 'auto';
}) {
  const response = await fetch('/api/ocr/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileUrl: params.fileUrl,
      fileName: params.fileName,
      taskId: params.taskId,
      provider: params.provider
    })
  });

  if (!response.ok) {
    throw new Error(`OCR处理失败: ${response.status}`);
  }

  const result = await response.json();
  console.log('🔍 API Response:', JSON.stringify(result, null, 2))
  const extracted = result.data?.ocrResult || result;
  console.log('🔍 Extracted from API:', JSON.stringify(extracted, null, 2))
  return extracted;
}