import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OAConfig } from '@/types/oa';

interface OAStore {
  configs: OAConfig[];
  
  // Actions
  addConfig: (config: OAConfig) => void;
  updateConfig: (id: string, updates: Partial<OAConfig>) => void;
  deleteConfig: (id: string) => void;
  setActiveStatus: (id: string, isActive: boolean) => void;
  
  // 获取活跃配置
  getActiveConfigs: () => OAConfig[];
  
  // 测试连接
  testConnection: (config: OAConfig) => Promise<boolean>;
}

export const useOAStore = create<OAStore>()(
  persist(
    (set, get) => ({
      configs: [],
      
      addConfig: (config) => set((state) => ({
        configs: [...state.configs, config]
      })),
      
      updateConfig: (id, updates) => set((state) => ({
        configs: state.configs.map(config =>
          config.id === id ? { ...config, ...updates } : config
        )
      })),
      
      deleteConfig: (id) => set((state) => ({
        configs: state.configs.filter(config => config.id !== id)
      })),
      
      setActiveStatus: (id, isActive) => set((state) => ({
        configs: state.configs.map(config =>
          config.id === id ? { ...config, isActive } : config
        )
      })),
      
      getActiveConfigs: () => {
        return get().configs.filter(config => config.isActive);
      },
      
      testConnection: async (config: OAConfig) => {
        try {
          // 这里可以添加实际的连接测试逻辑
          const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(config.accessToken && { 'Authorization': `Bearer ${config.accessToken}` })
            },
            body: JSON.stringify({ test: true })
          });
          
          return response.ok;
        } catch (error) {
          console.error('连接测试失败:', error);
          return false;
        }
      }
    }),
    {
      name: 'oa-store'
    }
  )
);