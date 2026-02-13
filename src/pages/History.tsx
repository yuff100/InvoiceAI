import React from 'react'
import { Card, List, Tag, Button, Typography, Empty, message, Space, Dropdown } from 'antd'
import { DeleteOutlined, EyeOutlined, DownloadOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useUploadStore } from '@/stores/uploadStore'
import { exportToExcel, exportToCSV } from '@/utils/export'
import dayjs from 'dayjs'
import type { ProcessingRecord } from '@/types/invoice'

const { Title, Text } = Typography

const HistoryPage: React.FC = () => {
  const { history, removeFromHistory } = useUploadStore()

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

  const handleDelete = (id: string) => {
    removeFromHistory(id)
  }

  const handleView = (record: any) => {
    console.log('查看详情:', record)
  }

  const handleExportExcel = () => {
    try {
      const completedRecords = history.filter(r => r.status === 'completed')
      if (completedRecords.length === 0) {
        message.warning('没有已完成的数据可导出')
        return
      }
      exportToExcel(completedRecords)
      message.success(`已导出 ${completedRecords.length} 条记录`)
    } catch (error) {
      message.error('导出失败: ' + (error as Error).message)
    }
  }

  const handleExportCSV = () => {
    try {
      const completedRecords = history.filter(r => r.status === 'completed')
      if (completedRecords.length === 0) {
        message.warning('没有已完成的数据可导出')
        return
      }
      exportToCSV(completedRecords)
      message.success(`已导出 ${completedRecords.length} 条记录`)
    } catch (error) {
      message.error('导出失败: ' + (error as Error).message)
    }
  }

  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Title level={2} className="mb-0">
            处理历史
          </Title>
          <Space>
            {history.filter(r => r.status === 'completed').length > 0 && (
              <>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExportExcel}
                >
                  导出Excel
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExportCSV}
                >
                  导出CSV
                </Button>
              </>
            )}
            {history.length > 0 && (
              <Button
                onClick={() => useUploadStore.getState().clearHistory()}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                清空历史
              </Button>
            )}
          </Space>
        </div>

        {history.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无处理记录"
            className="my-16"
          />
        ) : (
          <List
            grid={{
              gutter: 16,
              xs: 1,
              sm: 2,
              md: 2,
              lg: 3,
              xl: 3,
              xxl: 4,
            }}
            dataSource={history}
            renderItem={(record) => (
              <List.Item>
                <Card
                  hoverable
                  className="h-full"
                  actions={[
                    <Button
                      key="view"
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={() => handleView(record)}
                    >
                      查看
                    </Button>,
                    record.status === 'completed' && (
                      <Dropdown
                        key="export"
                        menu={{
                          items: [
                            {
                              key: 'excel',
                              icon: <FileExcelOutlined />,
                              label: '导出Excel',
                              onClick: () => {
                                try {
                                  exportToExcel([record])
                                  message.success('导出成功')
                                } catch (error) {
                                  message.error('导出失败: ' + (error as Error).message)
                                }
                              }
                            },
                            {
                              key: 'csv',
                              icon: <FileTextOutlined />,
                              label: '导出CSV',
                              onClick: () => {
                                try {
                                  exportToCSV([record])
                                  message.success('导出成功')
                                } catch (error) {
                                  message.error('导出失败: ' + (error as Error).message)
                                }
                              }
                            }
                          ]
                        }}
                      >
                        <Button type="text" icon={<DownloadOutlined />}>
                          导出
                        </Button>
                      </Dropdown>
                    ),
                    <Button
                      key="delete"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(record.id)}
                    >
                      删除
                    </Button>
                  ].filter(Boolean)}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <Text strong className="text-sm truncate flex-1">
                        {record.fileName}
                      </Text>
                      <Tag color={getStatusColor(record.status)}>
                        {getStatusText(record.status)}
                      </Tag>
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>上传时间: {dayjs(record.uploadTime).format('YYYY-MM-DD HH:mm')}</div>
                      {record.ocrResult && (
                        <div>
                          置信度: {Math.round((record.ocrResult.confidence || 0) * 100)}%
                        </div>
                      )}
                      {record.oaPushResults && (
                        <div>
                          OA推送: {record.oaPushResults.filter(r => r.success).length}/{record.oaPushResults.length}
                        </div>
                      )}
                    </div>

                    {record.error && (
                      <Text type="danger" className="text-xs">
                        {record.error}
                      </Text>
                    )}
                  </div>
                </Card>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  )
}

export default HistoryPage