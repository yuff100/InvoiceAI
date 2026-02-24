import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const qiniu = require('qiniu');

interface RequestBody {
  fileName: string;
}

interface UploadSignature {
  token: string;
  key: string;
  uploadUrl: string;
  fileUrl: string;
  expires: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const { fileName } = req.body as RequestBody;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    const accessKey = process.env.QINIU_ACCESS_KEY;
    const secretKey = process.env.QINIU_SECRET_KEY;
    const bucket = process.env.QINIU_BUCKET || 'invoice-ai-store';
    const domain = process.env.QINIU_DOMAIN || 'https://s3.qiniu.com';
    const region = process.env.QINIU_REGION || 'ap-southeast';

    console.log('Qiniu config:', { accessKey: accessKey ? 'set' : 'missing', bucket, domain, region });

    if (!accessKey || !secretKey) {
      return res.status(500).json({ error: 'Qiniu credentials not configured' });
    }

    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    const key = `invoices/${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${fileName}`;
    
    const putPolicy = new qiniu.rs.PutPolicy({
      scope: bucket,
      expires: 3600,
      returnBody: `{"key":"$(key)","hash":"$(etag)","bucket":"$(bucket)","fsize":$(fSize),"mimeType":"$(mimeType)"}`
    });
    
    const uploadToken = putPolicy.uploadToken(mac);
    const fileUrl = `${domain}/${key}`;
    
    const signature: UploadSignature = {
      token: uploadToken,
      key: key,
      uploadUrl: 'https://up-as0.qiniup.com',
      fileUrl: fileUrl,
      expires: Date.now() + 3600 * 1000
    };

    return res.status(200).json(signature);

  } catch (error) {
    console.error('Generate signature error:', error);
    return res.status(500).json({ error: 'Failed to generate upload signature' });
  }
}
