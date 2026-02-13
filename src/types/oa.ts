import { ProcessingRecord } from './invoice'

// OA系统配置
export interface OAConfig {
  id: string;
  name: string;
  type: 'dingtalk' | 'wechat' | 'feishu' | 'custom';
  apiUrl: string;
  accessToken?: string;
  appKey?: string;
  appSecret?: string;
  webhook?: string;
  fieldMappings: FieldMappingRule[];
  isActive: boolean;
}

// 字段映射规则
export interface FieldMappingRule {
  invoiceField: string;
  oaField: string;
  transform?: string; // 存储转换函数名称
}

// 应用配置
export interface AppConfig {
  oaConfigs: OAConfig[];
  processingHistory: ProcessingRecord[];
  settings: AppSettings;
}

// 应用设置
export interface AppSettings {
  autoPush: boolean;           // 自动推送OA
  compressionQuality: number;  // 图片压缩质量
  maxFileSize: number;         // 最大文件大小
  enableNotifications: boolean; // 启用通知
  ocrProvider: 'baidu' | 'tencent'; // OCR提供商
}