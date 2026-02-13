import * as qiniu from 'qiniu';

interface UploadSignature {
  token: string;
  key: string;
  uploadUrl: string;
  fileUrl: string;
  downloadUrl?: string;
  expires?: number;
}

const mac = new qiniu.auth.digest.Mac(
  process.env.QINIU_ACCESS_KEY!,
  process.env.QINIU_SECRET_KEY!
);

const config = new qiniu.conf.Config();
config.zone = qiniu.zone.Zone_z0;

const formUploader = new qiniu.form_up.FormUploader(config);
const putExtra = new qiniu.form_up.PutExtra();

export class QiniuStorageService {
  private bucket: string;
  private baseUrl: string;

  constructor() {
    this.bucket = process.env.QINIU_BUCKET || 'invoice-ai';
    this.baseUrl = process.env.QINIU_DOMAIN || 'https://s3.qiniu.com';
  }

  generateUploadSignature(fileName: string): UploadSignature {
    try {
      const key = `invoices/${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${fileName}`;
      
      const putPolicy = new qiniu.rs.PutPolicy({
        scope: this.bucket,
        expires: 3600,
        returnBody: `{"key":"$(key)","hash":"$(etag)","bucket":"$(bucket)","fsize":$(fSize),"mimeType":"$(mimeType)"}`
      });
      
      const uploadToken = putPolicy.uploadToken(mac);
      const fileUrl = `${this.baseUrl}/${key}`;
      
      return {
        token: uploadToken,
        key: key,
        uploadUrl: 'https://up.qbox.me',
        fileUrl: fileUrl,
        expires: Date.now() + 3600 * 1000
      };
    } catch (error) {
      console.error('生成七牛云上传签名失败:', error);
      throw new Error('生成上传签名失败');
    }
  }

  async uploadFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ fileUrl: string; key: string }> {
    try {
      const signature = this.generateUploadSignature(file.name);
      
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('token', signature.token);
        formData.append('key', signature.key);
        formData.append('file', file);
        
        const xhr = new XMLHttpRequest();
        
        if (onProgress) {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = (event.loaded / event.total) * 100;
              onProgress(progress);
            }
          });
        }
        
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.key) {
                resolve({
                  fileUrl: signature.fileUrl,
                  key: response.key
                });
              } else {
                reject(new Error('上传响应格式错误'));
              }
            } catch (error) {
              reject(new Error('上传响应解析失败'));
            }
          } else {
            reject(new Error(`上传失败: ${xhr.status} ${xhr.responseText}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('网络错误'));
        });
        
        xhr.open('POST', signature.uploadUrl);
        xhr.send(formData);
      });
    } catch (error) {
      console.error('上传文件失败:', error);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const bucketManager = new qiniu.rs.BucketManager(mac, config);
      return new Promise((resolve, reject) => {
        bucketManager.delete(this.bucket, key, (err, respBody, respInfo) => {
          if (err) {
            reject(err);
          } else if (respInfo.statusCode === 200) {
            resolve(true);
          } else {
            reject(new Error(`删除失败: ${respInfo.statusCode}`));
          }
        });
      });
    } catch (error) {
      console.error('删除文件失败:', error);
      return false;
    }
  }

  async getFileInfo(key: string): Promise<any> {
    try {
      const bucketManager = new qiniu.rs.BucketManager(mac, config);
      return new Promise((resolve, reject) => {
        bucketManager.stat(this.bucket, key, (err, respBody, respInfo) => {
          if (err) {
            reject(err);
          } else if (respInfo.statusCode === 200) {
            resolve(respBody);
          } else {
            reject(new Error(`获取文件信息失败: ${respInfo.statusCode}`));
          }
        });
      });
    } catch (error) {
      console.error('获取文件信息失败:', error);
      throw error;
    }
  }
}

export const qiniuStorageService = new QiniuStorageService();