import React, { useState } from 'react';
import { Upload, Button, Card, Spin, message, Space, Alert } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

const { Dragger } = Upload;

export default function SimpleOCRTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setResult(null);

    try {
      console.log('🔥 Testing OCR with file:', file.name);
      
      // 简单的测试：先尝试读取文件基本信息
      const reader = new FileReader();
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 显示文件信息
      setResult({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        imageBase64: imageBase64.substring(0, 100) + '...', // 只显示前100个字符
        message: '文件读取成功！Tesseract OCR功能已集成，等待API服务器修复。'
      });

      message.success('文件处理成功！');

    } catch (error: any) {
      console.error('✗ File processing failed:', error);
      message.error(`处理失败: ${error.message}`);
    } finally {
      setLoading(false);
    }

    return false;
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
      <Card title="简单OCR测试页面" style={{ marginBottom: '24px' }}>
        <Alert
          message="当前状态"
          description="OCR服务管理器和Tesseract API已实现，但Express路由配置需要进一步调试。此页面可以验证文件上传功能。"
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />
        
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽发票图片到此处</p>
          <p className="ant-upload-hint">
            支持 JPG、PNG 等图片格式
          </p>
        </Dragger>
      </Card>

      {loading && (
        <Card>
          <Space direction="vertical" align="center" style={{ width: '100%' }}>
            <Spin size="large" />
            <div>正在处理文件...</div>
          </Space>
        </Card>
      )}

      {result && (
        <Card title="处理结果" style={{ marginBottom: '24px' }}>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            <strong>文件名:</strong> {result.fileName}<br />
            <strong>文件大小:</strong> {result.fileSize} bytes<br />
            <strong>文件类型:</strong> {result.fileType}<br />
            <strong>Base64预览:</strong> {result.imageBase64}<br />
            <strong>状态:</strong> {result.message}
          </div>
        </Card>
      )}

      <Card title="系统状态" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>✅ 七牛云上传功能 - 已实现</div>
          <div>✅ 七牛云OCR API - 已实现</div>
          <div>✅ Tesseract OCR服务 - 已实现</div>
          <div>✅ OCR服务管理器 - 已实现</div>
          <div>⚠️ Express路由配置 - 需要调试</div>
          <div>⚠️ 完整集成测试 - 待完成</div>
        </Space>
      </Card>
    </div>
  );
}