# InvoiceAI - 智能发票管理系统设计文档

## 1. 项目概述

### 1.1 项目目标
开发一个无服务器的智能发票处理工具，专注于发票上传、OCR数据提取和OA系统集成，采用云原生架构，零运维成本。

### 1.2 核心价值
- **零运维**：无服务器架构，无需管理后端
- **成本极低**：小流量几乎免费，按需付费
- **快速部署**：一键发布，弹性伸缩
- **极简流程**：专注核心功能，去除复杂管理

## 2. 功能需求分析

### 2.1 核心功能模块

#### 2.1.1 发票上传模块
- **移动端适配**：响应式Web设计，支持手机拍照
- **格式支持**：PDF、JPG、PNG格式
- **文件验证**：文件类型、大小限制(10MB)
- **直传存储**：前端直传第三方对象存储
- **进度显示**：实时上传进度和状态
- **压缩优化**：自动压缩图片，节省存储成本

#### 2.1.2 OCR识别模块
- **云服务OCR**：调用百度/腾讯云OCR API
- **专注意票**：专门针对中国增值税发票优化
- **关键字段**：发票代码、发票号码、开票日期、金额、税率
- **异步处理**：云函数异步处理，避免阻塞
- **结果返回**：WebSocket实时推送识别结果
- **容错处理**：识别失败时支持手动修正

#### 2.1.3 OA集成模块
- **多平台支持**：钉钉、企业微信、飞书、自定义API
- **配置管理**：可视化配置OA连接信息
- **字段映射**：灵活的字段映射规则
- **批量推送**：支持批量发票数据推送
- **状态同步**：实时显示推送状态
- **重试机制**：失败自动重试，确保数据送达

#### 2.1.4 处理状态模块
- **实时状态**：上传→处理→识别→推送全流程状态
- **历史记录**：处理历史和结果查看
- **错误提示**：清晰的错误信息和解决建议
- **统计概览**：简单处理统计信息

## 3. 技术架构设计

### 3.1 无服务器架构选择

#### 3.1.1 前端技术栈
```typescript
// 核心框架
- React 18 + TypeScript (现代化前端)
- Vite (快速构建工具)
- Tailwind CSS (实用优先的CSS框架)

// 状态管理
- Zustand (轻量级状态管理)
- React Query (服务端状态管理)

// 工具库
- React Hook Form (表单处理)
- React Router (路由管理)
- Ant Design (UI组件库)
- image-compressor (图片压缩)
```

#### 3.1.2 云服务技术栈
```typescript
// 云函数平台
- Vercel Functions (首选，部署简单)
- Netlify Functions (备选)

// 第三方服务
- OCR服务：百度云OCR / 腾讯云OCR
- 对象存储：七牛云Kodo / 阿里云OSS
- 实时通信：WebSocket (Vercel提供)
```

#### 3.1.3 OCR技术方案
```typescript
// 主方案：云服务OCR
- 百度云OCR API（增值税发票专版）
- 腾讯云OCR API（发票识别）

// 备选方案
- 阿里云OCR API
- 讯飞OCR API

// 技术优势
- 识别准确率 > 98%
- 无需训练模型
- 按量付费，成本可控
```

### 3.2 项目结构
```
InvoiceAI/
├── src/                      # 源代码
│   ├── components/          # 通用组件
│   │   ├── Upload/         # 上传组件
│   │   ├── OCR/            # OCR相关组件
│   │   ├── OA/             # OA集成组件
│   │   └── Status/         # 状态显示组件
│   ├── pages/              # 页面组件
│   │   ├── Home/           # 主页
│   │   ├── Upload/         # 上传页面
│   │   └── History/        # 历史记录
│   ├── hooks/              # 自定义Hook
│   │   ├── useUpload.ts    # 上传Hook
│   │   ├── useOCR.ts       # OCR Hook
│   │   └── useOA.ts        # OA集成Hook
│   ├── services/           # 服务层
│   │   ├── storage.ts      # 对象存储服务
│   │   ├── ocr.ts          # OCR服务
│   │   ├── oa.ts           # OA服务
│   │   └── api.ts          # API封装
│   ├── types/              # TypeScript类型
│   │   ├── invoice.ts      # 发票类型
│   │   ├── oa.ts           # OA类型
│   │   └── common.ts       # 通用类型
│   ├── stores/             # 状态管理
│   │   ├── uploadStore.ts  # 上传状态
│   │   ├── ocrStore.ts     # OCR状态
│   │   └── oaStore.ts      # OA状态
│   └── utils/              # 工具函数
│       ├── compress.ts     # 图片压缩
│       ├── validate.ts     # 文件验证
│       └── format.ts       # 数据格式化
├── public/                 # 静态资源
├── api/                    # 云函数目录
│   ├── ocr/               # OCR处理云函数
│   ├── oa/                # OA集成云函数
│   └── upload/            # 文件上传云函数
├── docs/                   # 项目文档
├── package.json
├── vercel.json            # Vercel配置
└── README.md
```

### 3.3 数据存储设计

#### 3.3.1 无数据库架构
采用无服务器架构，无需传统数据库，使用以下存储方案：

```typescript
// 数据存储方案
1. 对象存储：发票文件存储
   - 阿里云OSS / AWS S3
   - 文件结构：/invoices/{date}/{uuid}.ext
   - 自动备份和版本管理

2. 云状态存储：处理状态临时存储
   - Vercel KV (Redis)
   - 处理任务状态缓存
   - 会话状态管理

3. 本地存储：用户配置和缓存
   - localStorage：OA配置信息
   - sessionStorage：临时处理状态
   - IndexedDB：历史记录缓存
```

#### 3.3.2 数据流设计
```typescript
// 数据流向设计
interface DataFlow {
  // 1. 文件上传
  upload: {
    source: '用户选择文件',
    process: '前端压缩 → 直传对象存储',
    storage: '对象存储',
    cache: 'localStorage缓存路径'
  },
  
  // 2. OCR处理
  ocr: {
    trigger: '上传完成',
    process: '云函数 → OCR API → 结果处理',
    storage: '临时缓存识别结果',
    notification: 'WebSocket推送结果'
  },
  
  // 3. OA推送
  oaPush: {
    trigger: 'OCR完成',
    process: '数据格式化 → OA API调用',
    storage: 'localStorage推送记录',
    notification: '状态更新通知'
  }
}
```

#### 3.3.3 配置数据结构
```typescript
// 本地存储配置结构
interface AppConfig {
  // OA系统配置
  oaConfigs: {
    id: string;
    name: string;
    type: 'dingtalk' | 'wechat' | 'feishu' | 'custom';
    apiUrl: string;
    accessToken?: string;
    appKey?: string;
    appSecret?: string;
    fieldMappings: Array<{
      invoiceField: string;
      oaField: string;
    }>;
  }[];
  
  // 处理历史
  processingHistory: Array<{
    id: string;
    fileName: string;
    uploadTime: string;
    status: 'uploading' | 'processing' | 'completed' | 'failed';
    ocrResult?: InvoiceData;
    oaPushResults?: Array<{
      oaType: string;
      status: 'success' | 'failed';
      message?: string;
    }>;
  }>;
  
  // 用户设置
  settings: {
    autoPush: boolean;        // 自动推送OA
    compressionQuality: number; // 图片压缩质量
    maxFileSize: number;      // 最大文件大小
  };
}
```

### 3.4 云函数API设计

#### 3.4.1 云函数规范
```
部署平台: Vercel Functions
调用方式: HTTPS请求
数据格式: JSON
认证方式: 简单Token验证（可选）
```

#### 3.4.2 云函数接口定义
```typescript
// 文件上传预处理
POST   /api/upload/signature // 获取对象存储签名
POST   /api/upload/complete  // 上传完成通知

// OCR处理
POST   /api/ocr/process      // 触发OCR处理
GET    /api/ocr/status/:id   // 获取处理状态
WebSocket /api/ocr/ws        // OCR结果实时推送

// OA集成
POST   /api/oa/push          // 推送到OA系统
GET    /api/oa/status/:id    // 获取推送状态
POST   /api/oa/batch         // 批量推送处理

// 配置管理（可选）
GET    /api/config/oa       // 获取OA配置模板
POST   /api/config/test      // 测试OA连接
```

#### 3.4.3 前端API封装
```typescript
// API服务封装示例
class InvoiceAPIService {
  private baseURL = '/api';
  
  // 获取上传签名
  async getUploadSignature(fileInfo: FileInfo): Promise<UploadSignature> {
    return this.post('/upload/signature', fileInfo);
  }
  
  // 上传完成，触发OCR
  async triggerOCR(fileInfo: UploadInfo): Promise<string> {
    return this.post('/ocr/process', fileInfo);
  }
  
  // 监听OCR结果
  subscribeToOCR(taskId: string, callback: (result: OCRResult) => void): () => void {
    const ws = new WebSocket(`${this.baseURL}/ocr/ws?taskId=${taskId}`);
    ws.onmessage = (event) => {
      callback(JSON.parse(event.data));
    };
    return () => ws.close();
  }
  
  // 推送到OA
  async pushToOA(invoiceData: InvoiceData, oaConfig: OAConfig): Promise<PushResult> {
    return this.post('/oa/push', {
      invoiceData,
      oaConfig
    });
  }
}
```

## 4. 详细功能设计

### 4.1 发票上传功能

#### 4.1.1 前端直传对象存储
```typescript
// 文件上传组件
interface UploadComponentProps {
  onUploadSuccess: (fileInfo: UploadInfo) => void;
  onUploadError: (error: string) => void;
  onProgressChange: (progress: number) => void;
}

// 文件验证和压缩
const processFile = async (file: File): Promise<ProcessedImage> => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('不支持的文件格式');
  }
  
  if (file.size > maxSize) {
    throw new Error('文件大小超过限制');
  }
  
  // 图片压缩
  if (file.type.startsWith('image/')) {
    return await compressImage(file, {
      quality: 0.8,
      maxWidth: 2048,
      maxHeight: 2048
    });
  }
  
  return { file, name: file.name };
};

// 直传七牛云存储
const uploadToStorage = async (
  processedFile: ProcessedImage,
  onProgress: (progress: number) => void
): Promise<string> => {
  // 获取上传签名
  const signature = await apiService.getUploadSignature({
    fileName: processedFile.name
  });
  
  // 七牛云上传需要特定格式
  const formData = new FormData();
  formData.append('token', signature.token);
  formData.append('key', signature.key);
  formData.append('file', processedFile.file);
  
  const xhr = new XMLHttpRequest();
  
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.key) {
            resolve(signature.fileUrl);
          } else {
            reject(new Error('上传响应格式错误'));
          }
        } catch (error) {
          reject(new Error('上传响应解析失败'));
        }
      } else {
        reject(new Error(`上传失败: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('网络错误'));
    });
    
    xhr.open('POST', signature.uploadUrl);
    xhr.send(formData);
  });
};
```

#### 4.1.2 云函数处理
```typescript
// api/upload/signature.ts - Vercel云函数（生成七牛上传凭证）
import { NextApiRequest, NextApiResponse } from 'next';
import { generateUploadSignature } from '../../../lib/storage';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { fileName } = req.body;
    
    if (!fileName) {
      return res.status(400).json({ error: '文件名不能为空' });
    }
    
    // 生成七牛云上传凭证
    const signature = await generateUploadSignature(fileName);
    
    res.json({ 
      success: true, 
      ...signature
    });
  } catch (error) {
    res.status(500).json({ 
      error: '生成上传凭证失败',
      message: error.message 
    });
  }
}

// api/upload/complete.ts - Vercel云函数（上传完成后触发OCR）
import { NextApiRequest, NextApiResponse } from 'next';
import { triggerOCR } from '../../../services/ocr';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { fileUrl, fileName, taskId } = req.body;
    
    // 触发OCR处理
    await triggerOCR({
      fileUrl,
      fileName,
      taskId,
      timestamp: Date.now()
    });
    
    res.json({ 
      success: true, 
      taskId,
      message: 'OCR处理已启动' 
    });
  } catch (error) {
    res.status(500).json({ 
      error: '处理失败',
      message: error.message 
    });
  }
}
```

### 4.2 OCR识别功能

#### 4.2.1 云服务OCR集成
```typescript
// OCR结果类型定义
interface InvoiceFields {
  invoiceCode?: string;      // 发票代码
  invoiceNumber?: string;    // 发票号码
  invoiceDate?: string;      // 开票日期
  sellerName?: string;        // 销方名称
  sellerTaxNumber?: string;  // 销方税号
  buyerName?: string;        // 购方名称
  buyerTaxNumber?: string;   // 购方税号
  totalAmount?: string;      // 价税合计
  taxAmount?: string;        // 税额
  checkCode?: string;        // 校验码
  confidence?: number;       // 置信度
}

// OCR云服务
class CloudOCRService {
  private baiduOCR: BaiduOCRService;
  private tencentOCR: TencentOCRService;
  
  constructor() {
    this.baiduOCR = new BaiduOCRService();
    this.tencentOCR = new TencentOCRService();
  }
  
  async extractInvoiceInfo(fileUrl: string): Promise<InvoiceFields> {
    try {
      // 优先使用百度OCR
      const baiduResult = await this.baiduOCR.recizeInvoice(fileUrl);
      if (baiduResult.confidence > 0.9) {
        return this.normalizeFields(baiduResult);
      }
      
      // 备选使用腾讯OCR
      const tencentResult = await this.tencentOCR.recizeInvoice(fileUrl);
      return this.normalizeFields(tencentResult);
      
    } catch (error) {
      console.error('OCR识别失败:', error);
      throw new Error('OCR处理失败，请稍后重试');
    }
  }
  
  private normalizeFields(result: any): InvoiceFields {
    // 统一字段格式，适配不同OCR服务
    return {
      invoiceCode: result.invoice_code,
      invoiceNumber: result.invoice_num,
      invoiceDate: this.normalizeDate(result.invoice_date),
      sellerName: result.seller_name,
      sellerTaxNumber: result.seller_register_num,
      buyerName: result.buyer_name,
      buyerTaxNumber: result.buyer_register_num,
      totalAmount: result.total_amount,
      taxAmount: result.total_tax,
      checkCode: result.check_code,
      confidence: result.confidence
    };
  }
  
  private normalizeDate(dateStr: string): string {
    // 统一日期格式: 2024-01-01
    if (!dateStr) return '';
    
    const patterns = [
      /(\d{4})年(\d{1,2})月(\d{1,2})日/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{4})(\d{2})(\d{2})/
    ];
    
    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        const [, year, month, day] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    return dateStr;
  }
}
```

#### 4.2.2 云函数OCR处理
```typescript
// api/ocr/process.ts - Vercel云函数
import { NextApiRequest, NextApiResponse } from 'next';
import { CloudOCRService } from '../../../services/ocr';
import { WebSocketService } from '../../../services/websocket';

const ocrService = new CloudOCRService();
const wsService = new WebSocketService();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { fileUrl, fileName, taskId } = req.body;
  
  // 异步处理，立即返回
  res.json({ 
    success: true, 
    taskId,
    message: 'OCR处理已启动' 
  });
  
  try {
    // 推送开始状态
    await wsService.broadcast(taskId, {
      status: 'processing',
      message: '正在识别发票...'
    });
    
    // 执行OCR识别
    const result = await ocrService.extractInvoiceInfo(fileUrl);
    
    // 推送完成状态
    await wsService.broadcast(taskId, {
      status: 'completed',
      data: result,
      message: '识别完成'
    });
    
  } catch (error) {
    // 推送失败状态
    await wsService.broadcast(taskId, {
      status: 'failed',
      error: error.message,
      message: '识别失败'
    });
  }
}
```

### 4.3 移动端适配

#### 4.3.1 响应式设计
```typescript
// 使用Tailwind CSS响应式类
const InvoiceList = () => {
  return (
    <div className="container mx-auto px-4">
      {/* 桌面端：网格布局 */}
      <div className="hidden md:grid grid-cols-3 gap-6">
        {/* 桌面端内容 */}
      </div>
      
      {/* 移动端：单列布局 */}
      <div className="md:hidden space-y-4">
        {/* 移动端内容 */}
      </div>
    </div>
  );
};
```

#### 4.3.2 移动端优化
```typescript
// 移动端拍照组件
const CameraCapture = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // 使用后置摄像头
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('无法访问摄像头:', error);
    }
  };
  
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      context?.drawImage(videoRef.current, 0, 0);
      
      // 转换为文件并上传
      canvasRef.current.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'invoice.jpg', { type: 'image/jpeg' });
          await uploadFile(file);
        }
      });
    }
  };
  
  return (
    <div className="camera-container">
      <video ref={videoRef} autoPlay playsInline />
      <canvas ref={canvasRef} className="hidden" />
      <button onClick={capturePhoto}>拍照</button>
    </div>
  );
};
```

### 4.3 OA系统集成

#### 4.3.1 OA系统配置
```typescript
// OA系统配置（本地存储）
interface OAConfig {
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
interface FieldMappingRule {
  invoiceField: string;
  oaField: string;
  transform?: string; // 存储转换函数名称
}

// OA配置管理Hook
const useOAConfig = () => {
  const [configs, setConfigs] = useState<OAConfig[]>([]);
  
  useEffect(() => {
    const stored = localStorage.getItem('oaConfigs');
    if (stored) {
      setConfigs(JSON.parse(stored));
    }
  }, []);
  
  const saveConfig = (config: OAConfig) => {
    const updated = [...configs, config];
    setConfigs(updated);
    localStorage.setItem('oaConfigs', JSON.stringify(updated));
  };
  
  const deleteConfig = (id: string) => {
    const updated = configs.filter(c => c.id !== id);
    setConfigs(updated);
    localStorage.setItem('oaConfigs', JSON.stringify(updated));
  };
  
  return { configs, saveConfig, deleteConfig };
};
```

#### 4.3.2 OA推送服务
```typescript
// OA推送服务（前端实现）
class OAPushService {
  async pushToOA(invoiceData: InvoiceFields, config: OAConfig): Promise<PushResult> {
    try {
      // 数据格式转换
      const oaData = this.transformData(invoiceData, config);
      
      // 推送到OA系统
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.accessToken && { 'Authorization': `Bearer ${config.accessToken}` })
        },
        body: JSON.stringify(oaData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          messageId: result.messageId || result.id,
          status: 'success'
        };
      } else {
        throw new Error(result.error || '推送失败');
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'failed'
      };
    }
  }
  
  private transformData(invoice: InvoiceFields, config: OAConfig): any {
    const oaData: any = {};
    
    // 字段映射转换
    config.fieldMappings.forEach(mapping => {
      const value = invoice[mapping.invoiceField];
      
      if (mapping.transform) {
        // 使用预定义的转换函数
        oaData[mapping.oaField] = this.applyTransform(value, mapping.transform);
      } else {
        oaData[mapping.oaField] = value;
      }
    });
    
    // 根据OA类型格式化
    switch (config.type) {
      case 'dingtalk':
        return this.formatForDingTalk(oaData);
      case 'wechat':
        return this.formatForWeChat(oaData);
      case 'feishu':
        return this.formatForFeishu(oaData);
      default:
        return oaData;
    }
  }
  
  private applyTransform(value: string, transformName: string): any {
    const transforms = {
      formatDate: (val: string) => val ? new Date(val).toISOString() : '',
      formatAmount: (val: string) => val ? parseFloat(val).toFixed(2) : '0.00',
      removeCommas: (val: string) => val?.replace(/,/g, ''),
      uppercase: (val: string) => val?.toUpperCase()
    };
    
    const transform = transforms[transformName];
    return transform ? transform(value) : value;
  }
  
  private formatForDingTalk(data: any): any {
    return {
      msgtype: 'oa_invoice',
      invoice: data,
      timestamp: Date.now()
    };
  }
  
  private formatForWeChat(data: any): any {
    return {
      msgtype: 'text',
      text: {
        content: `发票信息：${JSON.stringify(data, null, 2)}`
      }
    };
  }
  
  private formatForFeishu(data: any): any {
    return {
      msg_type: 'interactive',
      card: {
        header: { title: { tag: 'plain_text', content: '发票通知' } },
        elements: [{
          tag: 'div',
          text: { tag: 'plain_text', content: JSON.stringify(data, null, 2) }
        }]
      }
    };
  }
}
```

#### 4.3.3 云函数批量推送
```typescript
// api/oa/push.ts - Vercel云函数
import { NextApiRequest, NextApiResponse } from 'next';
import { OAPushService } from '../../../services/oa';

const oaService = new OAPushService();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { invoiceData, configs } = req.body;
  
  try {
    const results = await Promise.allSettled(
      configs.map(config => oaService.pushToOA(invoiceData, config))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success);
    
    res.json({
      success: true,
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason })
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '推送失败',
      message: error.message
    });
  }
}
```

## 5. 部署方案

### 5.1 无服务器部署架构

#### 5.1.1 Vercel部署配置
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    },
    {
      "src": "api/**/*.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "BAIDU_OCR_API_KEY": "@baidu-ocr-api-key",
    "BAIDU_OCR_SECRET_KEY": "@baidu-ocr-secret-key",
    "QINIU_ACCESS_KEY": "@qiniu-access-key",
    "QINIU_SECRET_KEY": "@qiniu-secret-key",
    "QINIU_BUCKET": "@qiniu-bucket"
  },
  "functions": {
    "api/ocr/process.ts": {
      "maxDuration": 30
    },
    "api/oa/push.ts": {
      "maxDuration": 10
    }
  }
}
```

#### 5.1.2 环境变量配置
```typescript
// .env.local (开发环境)
BAIDU_OCR_API_KEY=your_baidu_api_key
BAIDU_OCR_SECRET_KEY=your_baidu_secret_key
TENCENT_OCR_SECRET_ID=your_tencent_secret_id
TENCENT_OCR_SECRET_KEY=your_tencent_secret_key
QINIU_ACCESS_KEY=your_qiniu_access_key
QINIU_SECRET_KEY=your_qiniu_secret_key
QINIU_BUCKET=your_qiniu_bucket_name
QINIU_REGION=z0-eastern

// 生产环境通过Vercel面板配置
```

### 5.2 第三方服务配置

#### 5.2.1 对象存储配置
```typescript
// lib/storage.ts
import * as qiniu from 'qiniu';

// 七牛云配置
const mac = new qiniu.auth.digest.Mac(
  process.env.QINIU_ACCESS_KEY!,
  process.env.QINIU_SECRET_KEY!
);

const config = new qiniu.conf.Config();
// 华东区域
config.zone = qiniu.zone.Zone_z0;

const formUploader = new qiniu.form_up.FormUploader(config);
const putExtra = new qiniu.form_up.PutExtra();

// 生成上传凭证
export const generateUploadToken = (key: string): string => {
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: `${process.env.QINIU_BUCKET}:${key}`,
    expires: 3600 // 1小时有效期
  });
  return putPolicy.uploadToken(mac);
};

// 生成上传签名和文件信息
export const generateUploadSignature = async (fileName: string) => {
  const key = `invoices/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${Date.now()}-${fileName}`;
  const token = generateUploadToken(key);
  
  return {
    token,
    key,
    uploadUrl: `https://up.qbox.me`, // 七牛云华东区域上传地址
    fileUrl: `https://${process.env.QINIU_BUCKET}.cdn.clouddn.com/${key}`,
    downloadUrl: `https://${process.env.QINIU_BUCKET}.cos.ap-chengdu.myqcloud.com/${key}`
  };
};

// 上传文件到七牛云
export const uploadToQiniu = async (file: File, key: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const token = generateUploadToken(key);
    
    formUploader.putFile(token, key, file.path, putExtra, (respErr, respBody, respInfo) => {
      if (respErr) {
        reject(respErr);
        return;
      }
      
      if (respInfo.statusCode === 200) {
        resolve(`https://${process.env.QINIU_BUCKET}.cdn.clouddn.com/${key}`);
      } else {
        reject(new Error(`上传失败: ${respInfo.statusCode}`));
      }
    });
  });
};
```

#### 5.2.2 OCR服务配置
```typescript
// lib/ocr.ts
import AipOcrClient from 'baidu-aip-sdk';

// 百度OCR客户端
export const baiduOCR = new AipOcrClient(
  process.env.BAIDU_OCR_APP_ID,
  process.env.BAIDU_OCR_API_KEY,
  process.env.BAIDU_OCR_SECRET_KEY
);

// 发票识别接口
export const recognizeInvoice = async (imageUrl: string) => {
  try {
    const result = await baiduOCR.vatInvoice(imageUrl);
    return {
      success: true,
      data: result.words_result,
      confidence: result.words_result_num / Object.keys(result.words_result).length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
```

### 5.3 部署流程

#### 5.3.1 本地开发启动
```bash
# 安装依赖
npm install

# 安装七牛云SDK
npm install qiniu

# 启动开发服务器
npm run dev

# 环境变量设置
cp .env.example .env.local
# 编辑 .env.local 配置密钥
```

#### 5.3.1.1 package.json依赖
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "typescript": "^5.0.0",
    "qiniu": "^7.7.0",
    "baidu-aip-sdk": "^4.16.0",
    "axios": "^1.6.0",
    "react-hook-form": "^7.48.0",
    "zustand": "^4.4.0",
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    "@types/qiniu": "^7.0.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0"
  }
}
```

#### 5.3.2 生产环境部署
```bash
# 1. 连接Git仓库
git remote add origin https://github.com/username/invoiceai.git
git push origin main

# 2. 连接Vercel
npx vercel

# 3. 配置环境变量
# 在Vercel面板中配置所有API密钥

# 4. 自动部署
git push origin main  # 自动触发部署
```

#### 5.3.3 域名和SSL配置
```bash
# Vercel自动提供HTTPS域名
# 自定义域名配置
vercel domains add yourdomain.com

# 自动续期的SSL证书
# Vercel自动处理证书续期
```

## 6. 开发计划

### 6.1 第一周：无服务器架构搭建
- [x] 项目结构重组（前后端合一）
- [ ] Vercel项目初始化
- [ ] 对象存储配置（阿里云OSS/AWS S3）
- [ ] OCR服务配置（百度云OCR）
- [ ] 基础UI组件和路由

### 6.2 第二周：核心功能实现
- [ ] 文件上传组件（直传对象存储）
- [ ] 图片压缩和验证
- [ ] OCR识别云函数
- [ ] WebSocket状态推送
- [ ] 前端状态管理

### 6.3 第三周：OA集成和优化
- [ ] OA配置管理界面
- [ ] 多平台OA推送服务
- [ ] 字段映射转换
- [ ] 移动端适配优化
- [ ] 错误处理和重试机制

### 6.4 第四周：测试和部署
- [ ] 端到端测试
- [ ] 性能优化
- [ ] Vercel生产环境部署
- [ ] 使用文档编写
- [ ] 项目总结和分享

### 6.5 学习重点调整

#### 6.5.1 无服务器技术栈
- **Serverless Functions**: Vercel/Netlify Functions
- **云服务集成**: OCR API、对象存储
- **前端直连**: 省去后端开发成本
- **实时通信**: WebSocket状态推送

#### 6.5.2 成本控制策略
- **按量付费**: OCR调用、存储费用
- **免费额度**: Vercel免费套餐
- **CDN加速**: 自动全球分发
- **自动扩展**: 无需担心流量峰值

## 7. 学习重点

### 7.1 无服务器技术栈
- **前端**: React 18、TypeScript、Tailwind CSS、Vite
- **云函数**: Vercel Functions、Serverless架构
- **云服务**: OCR API、对象存储、WebSocket
- **实时通信**: WebSocket状态推送
- **成本优化**: 按量付费、免费额度利用

### 7.2 工程实践
- **代码规范**: ESLint、Prettier、TypeScript严格模式
- **版本控制**: Git工作流、Vercel自动部署
- **测试**: 前端单元测试、E2E测试
- **文档**: README、API文档、部署指南

### 7.3 云原生开发
- **无服务器架构**: 事件驱动、函数即服务
- **第三方集成**: 多云服务API调用
- **安全性**: API密钥管理、请求签名
- **监控**: Vercel Analytics、错误追踪

### 8. 扩展方向

### 8.1 功能扩展
- **多类型发票**: 支持更多发票类型和格式
- **批量处理**: 支持多文件同时上传和处理
- **高级配置**: 更灵活的OA字段映射规则
- **数据分析**: 简单的统计分析和报表

### 8.2 技术升级
- **多平台部署**: 支持Netlify等其他平台
- **AI增强**: 集成更多AI服务进行数据验证
- **插件化**: 支持自定义OA平台插件
- **移动端**: 开发React Native移动应用

### 8.3 商业化思考
- **SaaS服务**: 提供多租户版本
- **开源计划**: 部分功能开源，建立社区
- **企业版**: 支持更大规模和更高并发
- **API服务**: 将OCR处理能力开放为API

---

**项目类型**: 个人学习项目（无服务器架构）  
**核心功能**: 发票上传 + OCR识别 + OA集成  
**技术特点**: 零运维、低成本、高可用  
**目标用户**: 小型企业、个人开发者  
**发票类型**: 中国大陆增值税发票  
**技术栈**: React + Vercel + 七牛云 + OCR服务  
**开发周期**: 4周  
**部署方式**: Vercel无服务器部署  
**文档版本**: v2.0