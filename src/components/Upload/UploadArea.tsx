import React, { useState } from 'react'
import { Upload, message, Button } from 'antd'
import { InboxOutlined, CloudUploadOutlined } from '@ant-design/icons'
import { useUploadStore } from '@/stores/uploadStore'
import { useUpload } from '@/hooks/useUpload'

const { Dragger } = Upload

const UploadArea: React.FC = () => {
  const { maxFileSize } = useUploadStore()
  const { upload, isUploading } = useUpload()
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file: File) => {
    try {
      await upload(file)
    } catch (error) {
      // 错误已在Hook中处理
    }
    return false // 阻止Antd Upload默认上传行为
  }

  const beforeUpload = (file: File) => {
    handleFile(file)
    return false
  }

  return (
    <div className="bg-white rounded-xl shadow-custom p-8 border border-gray-100 glass-effect">
      <div className={`relative ${isUploading ? 'pointer-events-none' : ''}`}>
        <Dragger
          name="file"
          multiple={false}
          beforeUpload={beforeUpload}
          accept=".jpg,.jpeg,.png,.pdf"
          showUploadList={false}
          className={`upload-area ${dragging ? 'dragging' : ''} transition-all duration-300`}
          style={{
            padding: '40px 20px',
            minHeight: '300px',
            borderRadius: '12px'
          }}
          onDrop={() => {
            setDragging(false)
          }}
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
                支持 JPG、PNG、PDF 格式
              </p>
            </div>
            <div className="text-sm text-gray-400">
              文件大小不超过 {Math.round(maxFileSize / 1024 / 1024)}MB
            </div>
          </div>
        </Dragger>
        
        <div className="mt-6 text-center">
          <Button 
            type="primary" 
            size="large"
            icon={<CloudUploadOutlined />}
            loading={isUploading}
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.jpg,.jpeg,.png,.pdf'
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) {
                  handleFile(file)
                }
              }
              input.click()
            }}
            className="h-12 px-8 text-base font-medium"
          >
            {isUploading ? '上传中...' : '选择文件'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default UploadArea