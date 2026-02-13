import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProcessingRecord } from '@/types/invoice';

interface UploadStore {
  // 当前上传状态
  currentUpload: ProcessingRecord | null;
  isUploading: boolean;
  uploadProgress: number;
  
  // 历史记录
  history: ProcessingRecord[];
  
  // 设置
  autoPush: boolean;
  compressionQuality: number;
  maxFileSize: number;
  
  // Actions
  setCurrentUpload: (record: ProcessingRecord | null) => void;
  setIsUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  
  addToHistory: (record: ProcessingRecord) => void;
  updateHistoryRecord: (id: string, updates: Partial<ProcessingRecord>) => void;
  removeFromHistory: (id: string) => void;
  
  updateSettings: (settings: Partial<Pick<UploadStore, 'autoPush' | 'compressionQuality' | 'maxFileSize'>>) => void;
  
  // 清空历史记录
  clearHistory: () => void;
}

export const useUploadStore = create<UploadStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentUpload: null,
      isUploading: false,
      uploadProgress: 0,
      history: [],
      autoPush: true,
      compressionQuality: 0.8,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      
      // Actions
      setCurrentUpload: (record) => set({ currentUpload: record }),
      setIsUploading: (uploading) => set({ isUploading: uploading }),
      setUploadProgress: (progress) => set({ uploadProgress: progress }),
      
      addToHistory: (record) => set((state) => ({
        history: [record, ...state.history].slice(0, 100) // 只保留最近100条
      })),
      
      updateHistoryRecord: (id, updates) => set((state) => ({
        history: state.history.map(record =>
          record.id === id ? { ...record, ...updates } : record
        )
      })),
      
      removeFromHistory: (id) => set((state) => ({
        history: state.history.filter(record => record.id !== id)
      })),
      
      updateSettings: (settings) => set((state) => ({
        ...state,
        ...settings
      })),
      
      clearHistory: () => set({ history: [] })
    }),
    {
      name: 'upload-store',
      partialize: (state) => ({
        history: state.history.slice(0, 50), // 只持久化最近50条记录
        autoPush: state.autoPush,
        compressionQuality: state.compressionQuality,
        maxFileSize: state.maxFileSize
      })
    }
  )
);