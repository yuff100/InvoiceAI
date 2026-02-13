import React, { useState, useRef } from 'react'
import { Upload, message, Button, List, Progress, Tag } from 'antd'
import { InboxOutlined, CloudUploadOutlined, FileImageOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useUploadStore } from '@/stores/uploadStore'
import { useUpload } from '@/hooks/useUpload'
import type { UploadFile } from 'antd/es/upload/interface'

const { Dragger } = Upload

interface FileItem {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'completed' | 'error'
  progress: number
  error?: string
}

const UploadArea: React.FC = () => {
  const { maxFileSize } = useUploadStore()
  const { uploadMultiple, isUploading, uploadProgress } = useUpload()
  const [dragging, setDragging] = useState(false)
  const [fileList, setFileList] = useState<FileItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const validFiles: FileItem[] = []
    
    Array.from(files).forEach((file, index) => {
      // 验证文件类型
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      if (!validTypes.includes(file.type)) {
        message.error(`${file.name} 格式不支持`)
        return
      }
      
      // 验证文件大小
      if (file.size > maxFileSize) {
        message.error(`${file.name} 超过 ${Math.round(maxFileSize / 1024 / 1024)}MB 限制`)
        return
      }
      
      validFiles.push({
        file,
        id: `file_${Date.now()}_${index}`,
        status: 'pending',
        progress: 0
      })
    })

    if (validFiles.length > 0) {
      setFileList(prev => [...prev, ...validFiles])
      
      // 开始批量上传
      try {
        await uploadMultiple(validFiles.map(f => f.file), {
          onProgress: (fileName, progress) => {
            setFileList(prev => 
              prev.map(item => 
                item.file.name === fileName 
                  ? { ...item, status: 'uploading', progress }
                  : item
              )
            )
          },
          onComplete: (fileName, success, error) => {
            setFileList(prev => 
              prev.map(item => 
                item.file.name === fileName 
                  ? { ...item, status: success ? 'completed' : 'error', error, progress: success ? 100 : item.progress }
                  : item
              )
            )
          }
        })
      } catch (error) {
        console.error('批量上传失败:', error)
      }
    }
  }

  const beforeUpload = (file: File, fileList: UploadFile[]) => {
    // 阻止默认上传行为，手动处理
    return false
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeFile = (id: string) => {
    setFileList(prev => prev.filter(item => item.id !== id))
  }

  const getStatusTag = (status: FileItem['status']) => {
    const statusMap = {
      pending: <Tag color="default">等待中</Tag>,
      uploading: <Tag color="processing">上传中</Tag>,
      completed: <Tag color="success">完成</Tag>,
      error: <Tag color="error">失败</Tag>
    }
    return statusMap[status]
  }

  return (
    <div className="bg-white rounded-xl shadow-custom p-8 border border-gray-100 glass-effect">
      <div className={`relative ${isUploading ? 'pointer-events-none opacity-50' : ''}`}>
        <Dragger
          name="file"
          multiple={true}
          beforeUpload={beforeUpload}
          accept=".jpg,.jpeg,.png,.pdf"
          showUploadList={false}
          className={`upload-area ${dragging ? 'dragging' : ''} transition-all duration-300`}
          style={{
            padding: '40px 20px',
            minHeight: '250px',
            borderRadius: '12px'
          }}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <div className="mb-4">
              <InboxOutlined className="text-6xl text-blue-500" />
            </div>
            <div className="mb-4">
              <p className="text-xl font-semibold text-gray-900 mb-2">
                点击或拖拽文件到此区域上传
              </p>
              <p className="text-gray-500">
                支持 JPG、PNG、PDF 格式，可同时上传多个文件
              </p>
            </div>
            <div className="text-sm text-gray-400">
              单个文件不超过 {Math.round(maxFileSize / 1024 / 1024)}MB
            </div>
          </div>
        </Dragger>
        
        <div className="mt-6 text-center space-x-4">
          <input
            type="file"
            ref={inputRef}
            multiple
            accept=".jpg,.jpeg,.png,.pdf"
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button 
            type="primary" 
            size="large"
            icon={<CloudUploadOutlined />}
            loading={isUploading}
            onClick={() => inputRef.current?.click()}
            className="h-12 px-8 text-base font-medium"
          >
            {isUploading ? '上传中...' : '选择文件'}
          </Button>
        </div>
      </div>

      {/* 文件列表 */}
      {fileList.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-semibold text-gray-800">
              上传队列 ({fileList.filter(f => f.status === 'completed').length}/{fileList.length})
            </h4>
            {fileList.some(f => f.status === 'completed' || f.status === 'error') && (
              <Button 
                type="link" 
                onClick={() => setFileList([])}
              >
                清空列表
              </Button>
            )}
          </div>
          <List
            size="small"
            bordered
            dataSource={fileList}
            renderItem={(item) => (
              <List.Item
                actions={[
                  getStatusTag(item.status),
                  item.status !== 'uploading' && (
                    <Button 
                      type="text" 
                      size="small"
                      icon={<CloseCircleOutlined />}
                      onClick={() => removeFile(item.id)}
                    />
                  )
                ]}
              >
                <List.Item.Meta
                  avatar={<FileImageOutlined className="text-2xl text-blue-500" />}
                  title={item.file.name}
                  description={
                    item.status === 'uploading' ? (
                      <Progress 
                        percent={item.progress} 
                        size="small" 
                        status="active"
                        style={{ width: '200px' }}
                      />
                    ) : item.error ? (
                      <span className="text-red-500 text-sm">{item.error}</span>
                    ) : null
                  }
                />
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  )
}

export default UploadArea