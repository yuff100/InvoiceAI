import React from 'react'
import UploadArea from '@/components/Upload/UploadArea'
import ProcessingStatus from '@/components/Status/ProcessingStatus'
import { useUploadStore } from '@/stores/uploadStore'

const UploadPage: React.FC = () => {
  const { currentUpload, isUploading } = useUploadStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            智能发票处理
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            上传发票，自动识别信息，一键推送到OA系统
          </p>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：上传区域 */}
          <div className="lg:order-1">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                📤 上传发票
              </h2>
              <p className="text-gray-600">
                支持多种格式，智能识别发票信息
              </p>
            </div>
            <UploadArea />
          </div>

          {/* 右侧：处理状态 */}
          <div className="lg:order-2">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                🔄 处理状态
              </h2>
              <p className="text-gray-600">
                实时显示上传和处理进度
              </p>
            </div>
            {currentUpload && (
              <ProcessingStatus record={currentUpload} />
            )}
            
            {!currentUpload && !isUploading && (
              <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-100">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  等待上传
                </h3>
                <p className="text-gray-500">
                  上传发票后，这里将显示处理状态和识别结果
                </p>
                <div className="mt-6 space-y-2 text-left max-w-xs mx-auto">
                  <div className="flex items-center text-sm text-gray-400">
                    <span className="w-2 h-2 bg-gray-300 rounded-full mr-2"></span>
                    支持拖拽上传
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <span className="w-2 h-2 bg-gray-300 rounded-full mr-2"></span>
                    自动压缩图片
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <span className="w-2 h-2 bg-gray-300 rounded-full mr-2"></span>
                    高精度OCR识别
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 特性说明 */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">智能识别</h3>
            <p className="text-gray-600 text-sm">
              高精度OCR技术，准确提取发票信息
            </p>
          </div>
          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">快速处理</h3>
            <p className="text-gray-600 text-sm">
              秒级处理，实时反馈识别结果
            </p>
          </div>
          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">无缝集成</h3>
            <p className="text-gray-600 text-sm">
              一键推送到钉钉、企业微信等OA系统
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadPage