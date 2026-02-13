import React, { useState } from 'react';
import { Upload, Button, Card, Spin, message, Space } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

const { Dragger } = Upload;

export default function TesseractTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setResult(null);

    try {
      console.log('🔥 Testing Tesseract OCR with file:', file.name);
      
      // 将文件转换为base64
      const reader = new FileReader();
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 调用Tesseract OCR API
      const response = await fetch('/api/tesseract/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          extractFields: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📥 Tesseract response:', data);

      if (data.success) {
        setResult(data.data);
        message.success('OCR识别完成！');
      } else {
        throw new Error(data.error || 'OCR识别失败');
      }

    } catch (error: any) {
      console.error('✗ OCR test failed:', error);
      message.error(`OCR测试失败: ${error.message}`);
    } finally {
      setLoading(false);
    }

    return false; // 防止默认上传行为
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: 'image/*',
    beforeUpload: handleUpload,
    showUploadList: false,
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Card title="Tesseract OCR 测试" style={{ marginBottom: '24px' }}>
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽发票图片到此处</p>
          <p className="ant-upload-hint">
            支持 JPG、PNG 等图片格式，用于测试 Tesseract OCR 功能
          </p>
        </Dragger>
      </Card>

      {loading && (
        <Card>
          <Space direction="vertical" align="center" style={{ width: '100%' }}>
            <Spin size="large" />
            <div>正在使用 Tesseract 进行 OCR 识别...</div>
          </Space>
        </Card>
      )}

      {result && (
        <Card title="OCR 识别结果" style={{ marginBottom: '24px' }}>
          <div style={{ whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
            <strong>识别文本:</strong><br />
            {result.ocrText || '无文本'}
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <strong>置信度:</strong> {((result.confidence || 0) * 100).toFixed(2)}%
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong>处理时间:</strong> {(result.processingTime || 0).toFixed(0)}ms
          </div>

          {result.fields && Object.keys(result.fields).length > 0 && (
            <div>
              <strong>提取的字段:</strong>
              <ul>
                {Object.entries(result.fields).map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}:</strong> {value as string}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}