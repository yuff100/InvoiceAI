import { useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import { useUploadStore } from '@/stores/uploadStore'
import { ocrServiceManager, getUploadSignature, completeUpload } from '@/services/api'
import { validateFile, generateId, formatFileSize } from '@/utils'
import { ProcessedImage, ProcessingRecord } from '@/types/invoice'
import imageCompression from 'browser-image-compression'

interface UploadOptions {
  onProgress?: (fileName: string, progress: number) => void
  onComplete?: (fileName: string, success: boolean, record?: ProcessingRecord, error?: string) => void
}

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
  const [uploadProgress, setUploadProgressState] = useState<Record<string, number>>({})

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

  // 单个文件上传
  const uploadSingleFile = useCallback(async (
    file: File, 
    taskId: string,
    batchId?: string,
    callbacks?: UploadOptions
  ): Promise<ProcessingRecord> => {
    const processedFile = await processImage(file)
    
    callbacks?.onProgress?.(file.name, 30)
    
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(processedFile.file)
    })
    
    callbacks?.onProgress?.(file.name, 50)
    
    const ocrResult = await triggerOCRWithBase64(base64)
    const ocrData = ocrResult.data
    
    callbacks?.onProgress?.(file.name, 80)
    
    if (!ocrData?.success && !ocrData?.ocrText) {
      const failedRecord: ProcessingRecord = { 
        id: taskId,
        batchId,
        fileName: processedFile.name,
        uploadTime: new Date().toISOString(),
        status: 'failed', 
        error: 'OCR识别失败'
      }
      addToHistory(failedRecord)
      callbacks?.onComplete?.(file.name, false, failedRecord, 'OCR识别失败')
      return failedRecord
    }
    
    const completedRecord: ProcessingRecord = { 
      id: taskId,
      batchId,
      fileName: processedFile.name,
      uploadTime: new Date().toISOString(),
      status: 'completed', 
      progress: 100,
      ocrResult: {
        ...ocrData,
        ...ocrData?.fields
      }
    }
    
    addToHistory(completedRecord)
    callbacks?.onProgress?.(file.name, 100)
    callbacks?.onComplete?.(file.name, true, completedRecord)
    
    return completedRecord
  }, [processImage, triggerOCRWithBase64, addToHistory])

  // 批量上传
  const uploadMultiple = useCallback(async (
    files: File[],
    batchId?: string,
    callbacks?: UploadOptions
  ): Promise<void> => {
    if (files.length === 0) return
    
    setIsUploading(true)
    const totalFiles = files.length
    let completedCount = 0
    let successCount = 0
    
    try {
      const uploadPromises = files.map(async (file, index) => {
        const taskId = generateId(`task_${index}_`)
        
        try {
          const result = await uploadSingleFile(file, taskId, batchId, callbacks)
          completedCount++
          if (result.status === 'completed') {
            successCount++
          }
          return result
        } catch (error) {
          completedCount++
          const errorMsg = error instanceof Error ? error.message : '上传失败'
          const failedRecord: ProcessingRecord = {
            id: taskId,
            batchId,
            fileName: file.name,
            uploadTime: new Date().toISOString(),
            status: 'failed',
            error: errorMsg
          }
          callbacks?.onComplete?.(file.name, false, failedRecord, errorMsg)
          return null
        }
      })
      
      await Promise.allSettled(uploadPromises)
      
      if (successCount === totalFiles) {
        message.success(`成功上传 ${successCount} 个文件`)
      } else if (successCount > 0) {
        message.warning(`${successCount}/${totalFiles} 个文件上传成功`)
      } else {
        message.error('所有文件上传失败')
      }
    } finally {
      setIsUploading(false)
      queryClient.invalidateQueries({ queryKey: ['upload-history'] })
    }
  }, [uploadSingleFile, setIsUploading, queryClient])

  // 单个文件上传（保持向后兼容）
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true)
      setUploadProgress(0)
      
      try {
        const taskId = generateId('task_')
        
        const uploadRecord: ProcessingRecord = {
          id: taskId,
          fileName: file.name,
          uploadTime: new Date().toISOString(),
          status: 'processing',
          progress: 50
        }
        
        setCurrentUpload(uploadRecord)
        
        const result = await uploadSingleFile(file, taskId, {
          onProgress: (fileName, progress) => {
            setUploadProgress(progress)
          }
        })
        
        setCurrentUpload(result)
        
        if (result.status === 'completed') {
          message.success('OCR识别成功！')
        } else {
          message.error(result.error || '识别失败')
        }
        
        return result
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
    uploadMultiple,
    isUploading: uploadMutation.isPending,
    uploadProgress,
    error: uploadMutation.error
  }
}