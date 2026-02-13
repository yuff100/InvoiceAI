import React, { useState } from 'react'
import { Card, Button, List, Tag, Space, Typography, Empty } from 'antd'
import { SettingOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useOAStore } from '@/stores/oaStore'
import { useNavigate } from 'react-router-dom'
import OAConfigModal from '@/components/OA/OAConfigModal'

const { Title, Text } = Typography

const SettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const { configs, deleteConfig, setActiveStatus, getActiveConfigs } = useOAStore()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingConfig, setEditingConfig] = useState(null)

  const activeConfigs = getActiveConfigs()

  const handleEdit = (config: any) => {
    setEditingConfig(config)
    setModalVisible(true)
  }

  const handleDelete = (id: string, name: string) => {
    const confirm = window.confirm(`确定要删除配置 "${name}" 吗？`)
    if (confirm) {
      deleteConfig(id)
    }
  }

  const handleToggleActive = (id: string, isActive: boolean) => {
    setActiveStatus(id, !isActive)
  }

  const getPlatformIcon = (type: string) => {
    const icons: Record<string, string> = {
      dingtalk: '🔔',
      wechat: '💬',
      feishu: '🚀',
      custom: '⚙️'
    }
    return icons[type] || '📱'
  }

  const getPlatformName = (type: string) => {
    const names: Record<string, string> = {
      dingtalk: '钉钉',
      wechat: '企业微信',
      feishu: '飞书',
      custom: '自定义'
    }
    return names[type] || type
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Title level={2} className="mb-0">
            系统设置
          </Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            添加配置
          </Button>
        </div>

        {/* OA配置 */}
        <Card title="OA系统配置" className="mb-6">
          {configs.length === 0 ? (
            <Empty
              description="暂无OA配置"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button 
                type="primary" 
                onClick={() => setModalVisible(true)}
              >
                添加第一个配置
              </Button>
            </Empty>
          ) : (
            <List
              dataSource={configs}
              renderItem={(config) => (
                <List.Item
                  actions={[
                    <Button
                      key="toggle"
                      type={config.isActive ? 'default' : 'primary'}
                      size="small"
                      onClick={() => handleToggleActive(config.id, config.isActive)}
                    >
                      {config.isActive ? '禁用' : '启用'}
                    </Button>,
                    <Button
                      key="edit"
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(config)}
                    >
                      编辑
                    </Button>,
                    <Button
                      key="delete"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(config.id, config.name)}
                    >
                      删除
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div className="text-2xl">
                        {getPlatformIcon(config.type)}
                      </div>
                    }
                    title={
                      <Space>
                        <Text strong>{config.name}</Text>
                        {config.isActive ? (
                          <Tag color="green">启用</Tag>
                        ) : (
                          <Tag color="default">禁用</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="text-gray-500">平台:</span> {getPlatformName(config.type)}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {config.apiUrl}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
          
          {configs.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <Text className="text-blue-700">
                📌 当前有 {activeConfigs.length} 个活跃配置，上传完成后将自动推送到这些OA系统
              </Text>
            </div>
          )}
        </Card>

        {/* 快速导航 */}
        <Card title="快速导航">
          <Space direction="vertical" className="w-full">
            <Button 
              block 
              icon={<SettingOutlined />}
              onClick={() => navigate('/upload')}
            >
              上传发票
            </Button>
            <Button 
              block 
              icon={<SettingOutlined />}
              onClick={() => navigate('/history')}
            >
              查看历史
            </Button>
          </Space>
        </Card>
      </div>

      {/* OA配置弹窗 */}
      <OAConfigModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingConfig(null)
        }}
        editingConfig={editingConfig}
      />
    </div>
  )
}

export default SettingsPage