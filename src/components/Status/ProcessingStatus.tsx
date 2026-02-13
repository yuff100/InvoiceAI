import React from 'react'
import { Card, Progress, Tag, Button, Space, Divider, Typography, Descriptions } from 'antd'
import { ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { ProcessingRecord } from '@/types/invoice'
import { useOAStore } from '@/stores/oaStore'
import dayjs from 'dayjs'

const { Text } = Typography

interface ProcessingStatusProps {
  record: ProcessingRecord
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ record }) => {
  const { getActiveConfigs } = useOAStore()

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      idle: 'default',
      uploading: 'processing',
      processing: 'warning',
      completed: 'success',
      failed: 'error'
    }
    return colors[status] || 'default'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      idle: '待处理',
      uploading: '上传中',
      processing: '识别中',
      completed: '已完成',
      failed: '失败'
    }
    return texts[status] || status
  }

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      uploading: <ReloadOutlined spin className="text-blue-500" />,
      processing: <ReloadOutlined spin className="text-yellow-500" />,
      completed: <CheckCircleOutlined className="text-green-500" />,
      failed: <CloseCircleOutlined className="text-red-500" />
    }
    return icons[status]
  }

  const handleRetry = () => {
    // TODO: 实现重试逻辑
    console.log('重试处理:', record.id)
  }

  const handlePushToOA = async () => {
    try {
      const activeConfigs = getActiveConfigs()
      if (activeConfigs.length === 0) {
        // TODO: 显示配置提示
        console.log('请先配置OA系统')
        return
      }

      // TODO: 实现OA推送逻辑
      console.log('推送至OA:', record.id, activeConfigs)
    } catch (error) {
      console.error('OA推送失败:', error)
    }
  }

  return (
    <Card 
      className="shadow-lg border-0"
      styles={{
        header: { 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: '12px 12px 0 0',
          borderBottom: 'none'
        }
      }}
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(record.status)}
            <span className="text-lg font-semibold">处理状态</span>
          </div>
          <Tag 
            color={getStatusColor(record.status)} 
            style={{ 
              background: record.status === 'completed' ? '#52c41a' : 
                         record.status === 'failed' ? '#ff4d4f' : 
                         record.status === 'processing' ? '#faad14' : '#d9d9d9',
              border: 'none'
            }}
          >
            {getStatusText(record.status)}
          </Tag>
        </div>
      }
      extra={
        <Space>
          {record.status === 'failed' && (
            <Button 
              size="small" 
              onClick={handleRetry}
              className="hover:scale-105 transition-transform"
            >
              重试
            </Button>
          )}
          {record.status === 'completed' && (
            <Button 
              type="primary" 
              size="small" 
              onClick={handlePushToOA}
              className="hover:scale-105 transition-transform"
            >
              推送到OA
            </Button>
          )}
        </Space>
      }
    >
      {/* 进度显示 */}
      {(record.status === 'uploading' || record.status === 'processing') && (
        <div className="mb-4">
          <Progress 
            percent={record.progress || 0} 
            status={'active'}
            format={(percent) => `${percent}%`}
          />
        </div>
      )}

      {/* 基本信息 */}
      <Descriptions size="small" column={1} className="mb-4">
        <Descriptions.Item label="文件名">
          <Text strong>{record.fileName}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="上传时间">
          {dayjs(record.uploadTime).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
        {record.fileUrl && (
          <Descriptions.Item label="文件地址">
            <a href={record.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600">
              查看文件
            </a>
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* OCR结果 */}
      {record.ocrResult && (
        <>
          <Divider>OCR识别结果</Divider>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">识别置信度:</span>
                <Tag color={((record.ocrResult?.confidence || 0) > 0.9) ? 'green' : ((record.ocrResult?.confidence || 0) > 0.7) ? 'orange' : 'red'}>
                  {Math.round(((record.ocrResult?.confidence || 0)) * 100)}%
                </Tag>
            </div>
            
            {record.ocrResult && typeof record.ocrResult === 'object' && Object.keys(record.ocrResult).length > 0 && Object.entries(record.ocrResult).map(([key, value]) => {
              if (key === 'confidence' || !value) return null
              if (key === 'items') return null // 单独处理items
              if (typeof value === 'object') return null // 跳过其他对象类型的值
              
              const fieldLabels: Record<string, string> = {
                invoiceCode: '发票代码',
                invoiceNumber: '发票号码',
                invoiceDate: '开票日期',
                sellerName: '销方名称',
                sellerTaxNumber: '销方税号',
                buyerName: '购方名称',
                buyerTaxNumber: '购方税号',
                totalAmount: '价税合计',
                taxAmount: '税额',
                checkCode: '校验码'
              }
              
              return (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600">{fieldLabels[key] || key}:</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              )
            })}
            
            {/* 项目明细 */}
            {record.ocrResult && record.ocrResult.items && record.ocrResult.items.length > 0 && (
              <>
                <Divider>项目明细</Divider>
                <div className="space-y-2">
                  {record.ocrResult.items.map((item: any, index: number) => (
                    <div key={index} className="bg-gray-50 rounded p-2 text-sm">
                      <div className="font-medium">{item.name}</div>
                      <div className="flex justify-between text-gray-600 mt-1">
                        <span>金额: <span className="font-medium">{item.amount}</span></span>
                        {item.taxRate && <span>税率: <span className="font-medium">{item.taxRate * 100}%</span></span>}
                        {item.taxAmount && <span>税额: <span className="font-medium">{item.taxAmount}</span></span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* OA推送结果 */}
      {record.oaPushResults && record.oaPushResults.length > 0 && (
        <>
          <Divider>OA推送结果</Divider>
          <div className="space-y-2">
            {record.oaPushResults.map((result, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-600">{result.oaType}:</span>
                <Tag color={result.success ? 'green' : 'red'}>
                  {result.success ? '成功' : '失败'}
                  {result.error && ` (${result.error})`}
                </Tag>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 错误信息 */}
      {record.error && (
        <>
          <Divider>错误信息</Divider>
          <Text type="danger">{record.error}</Text>
        </>
      )}
    </Card>
  )
}

export default ProcessingStatus