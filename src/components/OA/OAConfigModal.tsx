import React, { useState } from 'react'
import { Modal, Form, Input, Select, Button, message } from 'antd'
import { useOAStore } from '@/stores/oaStore'
import { OAConfig } from '@/types/oa'

const { Option } = Select

interface OAConfigModalProps {
  visible: boolean
  onCancel: () => void
  editingConfig?: OAConfig | null
}

const OAConfigModal: React.FC<OAConfigModalProps> = ({
  visible,
  onCancel,
  editingConfig
}) => {
  const { addConfig, updateConfig, testConnection } = useOAStore()
  const [form] = Form.useForm()
  const [testing, setTesting] = useState(false)

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      const config: OAConfig = {
        id: editingConfig?.id || `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...values,
        isActive: true,
        fieldMappings: [] // TODO: 实现字段映射
      }

      if (editingConfig) {
        await updateConfig(editingConfig.id, values)
        message.success('配置更新成功')
      } else {
        await addConfig(config)
        message.success('配置添加成功')
      }

      form.resetFields()
      onCancel()
    } catch (error) {
      message.error('保存失败：' + error.message)
    }
  }

  const handleTestConnection = async () => {
    try {
      const values = await form.validateFields()
      setTesting(true)
      
      const testConfig: OAConfig = {
        id: 'test',
        ...values,
        isActive: true,
        fieldMappings: []
      }

      const success = await testConnection(testConfig)
      
      if (success) {
        message.success('连接测试成功')
      } else {
        message.error('连接测试失败')
      }
    } catch (error) {
      message.error('连接测试失败：' + error.message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <Modal
      title={editingConfig ? '编辑OA配置' : '添加OA配置'}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="test" onClick={handleTestConnection} loading={testing}>
          测试连接
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          保存
        </Button>
      ]}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={editingConfig}
      >
        <Form.Item
          name="name"
          label="配置名称"
          rules={[{ required: true, message: '请输入配置名称' }]}
        >
          <Input placeholder="例如：钉钉工作群" />
        </Form.Item>

        <Form.Item
          name="type"
          label="OA平台类型"
          rules={[{ required: true, message: '请选择OA平台类型' }]}
        >
          <Select placeholder="请选择OA平台">
            <Option value="dingtalk">钉钉</Option>
            <Option value="wechat">企业微信</Option>
            <Option value="feishu">飞书</Option>
            <Option value="custom">自定义</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="apiUrl"
          label="API地址"
          rules={[
            { required: true, message: '请输入API地址' },
            { type: 'url', message: '请输入有效的URL' }
          ]}
        >
          <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=" />
        </Form.Item>

        <Form.Item
          name="accessToken"
          label="访问令牌"
          rules={[{ required: true, message: '请输入访问令牌' }]}
        >
          <Input.Password placeholder="请输入access token" />
        </Form.Item>

        <Form.Item
          name="appKey"
          label="App Key"
          help="可选，部分平台需要"
        >
          <Input placeholder="请输入App Key" />
        </Form.Item>

        <Form.Item
          name="appSecret"
          label="App Secret"
          help="可选，部分平台需要"
        >
          <Input.Password placeholder="请输入App Secret" />
        </Form.Item>

        <Form.Item
          name="webhook"
          label="Webhook地址"
          help="可选，用于接收回调"
        >
          <Input placeholder="https://your-domain.com/webhook" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default OAConfigModal