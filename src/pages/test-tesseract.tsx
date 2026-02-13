import React from 'react';
import { Layout, Typography } from 'antd';
import TesseractTest from '@/components/TesseractTest';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function TestPage() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Title level={3} style={{ margin: '16px 0', color: '#1890ff' }}>
          InvoiceAI - Tesseract OCR 测试
        </Title>
      </Header>
      
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <TesseractTest />
        </div>
      </Content>
    </Layout>
  );
}