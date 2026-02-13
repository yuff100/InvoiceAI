import React from 'react'
import { Layout, Menu, Button, Space } from 'antd'
import { UploadOutlined, HistoryOutlined, HomeOutlined, SettingOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const { Header } = Layout

const Navbar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页'
    },
    {
      key: '/upload',
      icon: <UploadOutlined />,
      label: '上传发票'
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: '处理历史'
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置'
    }
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  return (
    <Header className="bg-white shadow-sm border-b border-gray-200 px-0">
      <div className="container-desktop h-full flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-xl font-bold text-primary-600 mr-8">
            InvoiceAI
          </div>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            className="border-0"
          />
        </div>
        
        <Space>
          <Button type="text" size="small">
            帮助
          </Button>
        </Space>
      </div>
    </Header>
  )
}

export default Navbar