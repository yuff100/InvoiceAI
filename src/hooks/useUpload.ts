import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import { useUploadStore } from '@/stores/uploadStore'
import { ocrServiceManager, getUploadSignature, completeUpload } from '@/services/api'
import { validateFile, generateId, formatFileSize } from '@/utils'
import { ProcessedImage, ProcessingRecord } from '@/types/invoice'
import imageCompression from 'browser-image-compression'

export const useUpload = () => {
  const {
    setCurrentUpload,
    setIsUploading,
    setUploadProgress,
    addToHistory,
    compressionQuality,
    maxFileSize
  } = useUploadStore()
  
  const queryClient = useQueryClient()

  const processImage = useCallback(async (file: File): Promise<ProcessedImage> => {
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error || '文件验证失败')
    }

    if (file.type.startsWith('image/')) {
      try {
        const compressedFile = await imageCompression(file, {
          maxWidth: 2048,
          maxHeight: 2048,
          preserveAspectRatio: true,
        } as any)
        
        console.log(`图片压缩: ${formatFileSize(file.size)} → ${formatFileSize(compressedFile.size)}`)
        
        return {
          file: compressedFile,
          name: file.name,
          size: compressedFile.size,
          type: compressedFile.type
        }
      } catch (error) {
        console.warn('图片压缩失败，使用原文件:', error)
      }
    }

    return {
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }
  }, [compressionQuality, maxFileSize])

  const uploadToQiniu = useCallback(async (
    processedFile: ProcessedImage,
    onProgress: (progress: number) => void
  ): Promise<string> => {
    console.log('🔥 Getting upload signature for:', processedFile.name)
    try {
      const signature = await getUploadSignature(processedFile.name)
      console.log('✅ Upload signature:', signature)
      
      return new Promise<string>((resolve, reject) => {
        const formData = new FormData()
        formData.append('token', signature.token)
        formData.append('key', signature.key)
        formData.append('file', processedFile.file)
        
        const xhr = new XMLHttpRequest()
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100
            onProgress(progress)
          }
        })
        
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText)
              if (response.key) {
                resolve(signature.fileUrl)
              } else {
                reject(new Error('上传响应格式错误'))
              }
            } catch (error) {
              reject(new Error('上传响应解析失败'))
            }
          } else {
            reject(new Error(`上传失败: ${xhr.status}`))
          }
        })
        
        xhr.addEventListener('error', () => {
          reject(new Error('网络错误'))
        })
        
        xhr.open('POST', signature.uploadUrl)
        xhr.send(formData)
      })
    } catch (error) {
      console.error('❌ Get signature error:', error)
      throw error
    }
  }, [])

  // 使用Base64图片做OCR
  const triggerOCRWithBase64 = useCallback(async (base64Image: string) => {
    console.log('🔥 Triggering OCR with base64 image...')
    try {
      const response = await fetch('/api/tesseract/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          extractFields: true
        })
      })
      
      if (!response.ok) {
        throw new Error(`OCR failed: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('✅ OCR Result:', result)
      return result
    } catch (error) {
      console.error('❌ OCR Error:', error)
      throw error
    }
  }, [])

  const triggerOCR = useCallback(async (params: {
    fileUrl: string
    fileName: string
    taskId: string
  }) => {
    console.log('🔥 Triggering OCR with params:', params)
    try {
      const result = await completeUpload(params)
      console.log('✅ OCR Result:', result)
      return result
    } catch (error) {
      console.error('❌ OCR Error:', error)
      throw error
    }
  }, [])

  // 直接用Base64图片做OCR（跳过七牛云上传）
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true)
      setUploadProgress(0)
      
      try {
        const processedFile = await processImage(file)
        const taskId = generateId('task_')
        
        const uploadRecord: ProcessingRecord = {
          id: taskId,
          fileName: processedFile.name,
          uploadTime: new Date().toISOString(),
          status: 'processing',
          progress: 50
        }
        
        setCurrentUpload(uploadRecord)
        
        // 直接使用原始图片，不额外压缩
        console.log('📥 Using original image for OCR, size:', processedFile.size)
        
        // 将图片转为Base64
        console.log('📥 Converting image to base64...')
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(processedFile.file)
        })
        
        console.log('📥 Base64长度:', base64.length)
        setUploadProgress(70)
        
        console.log('📥 Starting OCR with base64 image...')
        // 直接调用Tesseract OCR（用base64）
        const ocrResult = await triggerOCRWithBase64(base64)
        
        console.log('📥 OCR Result received:', ocrResult)
        
        const ocrData = ocrResult.data
        
        if (!ocrData?.success && !ocrData?.ocrText) {
          const failedRecord: ProcessingRecord = { 
            id: taskId,
            fileName: processedFile.name,
            uploadTime: new Date().toISOString(),
            status: 'failed', 
            error: 'OCR识别失败：无法识别图片内容'
          }
          setCurrentUpload(failedRecord)
          addToHistory(failedRecord)
          message.warning('OCR识别失败')
          throw new Error('OCR识别失败')
        }
        
        const completedRecord: ProcessingRecord = { 
          id: taskId,
          fileName: processedFile.name,
          uploadTime: new Date().toISOString(),
          status: 'completed', 
          progress: 100,
          ocrResult: {
            ...ocrData,
            ...ocrData?.fields
          }
        }
        
        console.log('📥 Setting completed record:', completedRecord)
        setCurrentUpload(completedRecord)
        addToHistory(completedRecord)
        
        setUploadProgress(100)
        message.success('OCR识别成功！')
        
        return {
          success: true,
          ocrResult: ocrData
        }
      } catch (error) {
        console.error('上传失败:', error)
        const errorMessage = error instanceof Error ? error.message : '上传失败，请重试'
        message.error(errorMessage)
        throw error
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload-history'] })
    }
  })

  return {
    upload: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    error: uploadMutation.error
  }
}