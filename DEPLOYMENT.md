# 发票处理系统 - 部署说明

## 🚀 快速部署

### 1. 环境变量配置

复制 `.env.example` 为 `.env.local` 并配置你的七牛云凭证：

```env
QINIU_ACCESS_KEY=your_qiniu_access_key
QINIU_SECRET_KEY=your_qiniu_secret_key  
QINIU_BUCKET=your_qiniu_bucket_name
QINIU_DOMAIN=https://your-domain.com  # 可选，默认 https://s3.qiniu.com
```

### 2. Vercel 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

在 Vercel 控制台配置环境变量：
- `QINIU_ACCESS_KEY`
- `QINIU_SECRET_KEY` 
- `QINIU_BUCKET`
- `QINIU_DOMAIN` (可选)

### 3. 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 📋 功能特性

- ✅ **真实七牛云API集成** - 不再使用模拟数据
- ✅ **安全文件上传** - 使用七牛云存储签名
- ✅ **智能OCR识别** - 调用七牛云发票OCR API
- ✅ **零服务器架构** - 完全基于 Vercel 函数
- ✅ **TypeScript 支持** - 完整类型安全

## 🔧 API 端点

| 端点 | 方法 | 功能 |
|-------|------|------|
| `/api/qiniu/signature` | POST | 生成七牛云上传签名 |
| `/api/ocr/process` | POST | 处理发票OCR识别 |

## 🧪 测试

应用已通过以下测试：
- ✅ TypeScript 类型检查
- ✅ 生产构建成功
- ✅ ESLint 代码检查
- ✅ API 路由配置正确

## 📝 使用说明

1. 打开应用后，点击或拖拽上传发票图片
2. 系统自动上传到七牛云存储
3. 调用七牛云OCR API 识别发票内容
4. 显示识别结果和发票详细信息

## 🐛 故障排除

### 上传失败
- 检查七牛云凭证是否正确
- 确认 Bucket 权限设置
- 验证域名配置

### OCR识别失败  
- 确认OCR服务已开通
- 检查图片格式是否支持（JPG/PNG/PDF）
- 验证图片质量和清晰度

### 404错误
- 已修复！现在使用真实API，不再有404错误

## 📞 支持

如有问题，请检查：
1. 环境变量配置
2. 七牛云服务权限
3. 网络连接状态