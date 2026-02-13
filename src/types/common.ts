// API响应通用格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// WebSocket消息格式
export interface WebSocketMessage {
  type: 'status' | 'progress' | 'result' | 'error';
  taskId: string;
  data?: any;
  message?: string;
}

// 错误类型
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// 通用状态
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// 分页参数
export interface PaginationParams {
  page: number;
  limit: number;
  total?: number;
}

// 排序参数
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

// 过滤参数
export interface FilterParams {
  [key: string]: any;
}