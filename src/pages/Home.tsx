import React from 'react'
import { Card, Button, Typography } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph } = Typography

const HomePage: React.FC = () => {
  const navigate = useNavigate()

  const features = [
    {
      title: '智能OCR识别',
      description: '高精度发票信息自动提取，支持多种发票格式',
      icon: '🤖'
    },
    {
      title: '无服务器架构',
      description: '零运维成本，按需付费，弹性扩展',
      icon: '☁️'
    },
    {
      title: 'OA系统集成',
      description: '支持钉钉、企业微信等主流OA平台',
      icon: '🔗'
    },
    {
      title: '移动端适配',
      description: '响应式设计，随时随地处理发票',
      icon: '📱'
    }
  ]

  return (
    <div className="py-12">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <Title level={1} className="mb-4">
          智能发票处理系统
        </Title>
        <Paragraph className="text-lg text-gray-600 mb-8">
          基于AI技术的无服务器发票管理工具，支持自动识别、数据提取和OA系统集成
        </Paragraph>
        <Button
          type="primary"
          size="large"
          icon={<UploadOutlined />}
          onClick={() => navigate('/upload')}
          className="bg-primary-600 hover:bg-primary-700"
        >
          开始上传发票
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {features.map((feature, index) => (
          <Card
            key={index}
            className="text-center hover:shadow-lg transition-shadow duration-300"
            bodyStyle={{ padding: '24px' }}
          >
            <div className="text-4xl mb-4">{feature.icon}</div>
            <Title level={4} className="mb-2">
              {feature.title}
            </Title>
            <Paragraph className="text-gray-600">
              {feature.description}
            </Paragraph>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default HomePage