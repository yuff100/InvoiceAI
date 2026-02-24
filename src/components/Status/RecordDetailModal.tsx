import React from 'react'
import { Modal, Card, Descriptions, List, Tag, Button, Space, Typography, Divider, Progress } from 'antd'
import { DownloadOutlined, FileTextOutlined, FileExcelOutlined } from '@ant-design/icons'
import { exportToExcel, exportToCSV } from '@/utils/export'
import dayjs from 'dayjs'
import type { ProcessingRecord } from '@/types/invoice'

const { Title, Text } = Typography

interface RecordDetailModalProps {
  record: ProcessingRecord
  visible: boolean
  onClose: () => void
}

const RecordDetailModal: React.FC<RecordDetailModalProps> = ({ record, visible, onClose }) => {
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

  const handleExportExcel = () => {
    try {
      exportToExcel([record])
      Modal.info({
        title: '导出成功',
        content: '已成功导出记录到Excel文件',
        onOk: () => {}
      })
    } catch (error) {
      Modal.error({
        title: '导出失败',
        content: (error as Error).message,
        onOk: () => {}
      })
    }
  }

  const handleExportCSV = () => {
    try {
      exportToCSV([record])
      Modal.info({
        title: '导出成功',
        content: '已成功导出记录到CSV文件',
        onOk: () => {}
      })
    } catch (error) {
      Modal.error({
        title: '导出失败',
        content: (error as Error).message,
        onOk: () => {}
      })
    }
  }

  return (
    <Modal
      title="记录详情"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
    >
      <Card className="w-full">
        {/* 基本信息 */}
        <div className="mb-6">
          <Title level={4} className="mb-4">基本信息</Title>
          <Descriptions layout="vertical" column={2} bordered>
            <Descriptions.Item label="文件名">{record.fileName}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getStatusColor(record.status)}>
                {getStatusText(record.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="上传时间">
              {dayjs(record.uploadTime).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="处理进度">
              <Progress 
                percent={record.progress || 0} 
                status={record.status === 'failed' ? 'exception' : 'active'}
                format={(percent) => `${percent}%`}
              />
            </Descriptions.Item>
          </Descriptions>
        </div>

        {/* OCR结果 */}
        {record.ocrResult && (
          <div className="mb-6">
            <Title level={4} className="mb-4">OCR识别结果</Title>
            <Descriptions layout="vertical" column={2} bordered>
              <Descriptions.Item label="识别置信度">
                <Tag color={((record.ocrResult?.confidence || 0) > 0.9) ? 'green' : ((record.ocrResult?.confidence || 0) > 0.7) ? 'orange' : 'red'}>
                  {Math.round(((record.ocrResult?.confidence || 0)) * 100)}%
                </Tag>
              </Descriptions.Item>
              
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
                  totalSum: '总额',
                  checkCode: '校验码'
                }
                
                return (
                  <Descriptions.Item key={key} label={fieldLabels[key] || key}>
                    <Text strong>{String(value)}</Text>
                  </Descriptions.Item>
                )
              })}
            </Descriptions>
            
            {/* 项目明细 */}
            {record.ocrResult && record.ocrResult.items && record.ocrResult.items.length > 0 && (
              <>
                <Divider>项目明细</Divider>
                <List
                  size="small"
                  bordered
                  dataSource={record.ocrResult.items}
                  renderItem={(item: any) => (
                    <List.Item>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{item.name}</span>
                        <Space>
                          <span>金额: <span className="font-medium">{item.amount}</span></span>
                          {item.taxRate && <span>税率: <span className="font-medium">{item.taxRate * 100}%</span></span>}
                          {item.taxAmount && <span>税额: <span className="font-medium">{item.taxAmount}</span></span>}
                        </Space>
                      </div>
                    </List.Item>
                  )}
                />
              </>
            )}
          </div>
        )}

        {/* OA推送结果 */}
        {record.oaPushResults && record.oaPushResults.length > 0 && (
          <div className="mb-6">
            <Title level={4} className="mb-4">OA推送结果</Title>
            <List
              size="small"
              bordered
              dataSource={record.oaPushResults}
              renderItem={(result: any) => (
                <List.Item>
                  <div className="flex justify-between items-center">
                    <span>{result.oaType}</span>
                    <Tag color={result.success ? 'green' : 'red'}>
                      {result.success ? '成功' : '失败'}
                      {result.error && ` (${result.error})`}
                    </Tag>
                  </div>
                </List.Item>
              )}
            />
          </div>
        )}

        {/* 错误信息 */}
        {record.error && (
          <div>
            <Title level={4} className="mb-4">错误信息</Title>
            <Card type="inner" className="bg-red-50">
              <Text type="danger">{record.error}</Text>
            </Card>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end mt-6 space-x-4">
          <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>
            导出Excel
          </Button>
          <Button icon={<FileTextOutlined />} onClick={handleExportCSV}>
            导出CSV
          </Button>
        </div>
      </Card>
    </Modal>
  )
}

export default RecordDetailModal