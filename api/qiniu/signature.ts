import * as qiniu from 'qiniu';

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

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: RequestBody = await req.json();
    const { fileName } = body;

    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'fileName is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const accessKey = process.env.QINIU_ACCESS_KEY;
    const secretKey = process.env.QINIU_SECRET_KEY;
    const bucket = process.env.QINIU_BUCKET || 'invoice-ai';
    const domain = process.env.QINIU_DOMAIN || 'https://s3.qiniu.com';

    if (!accessKey || !secretKey) {
      return new Response(
        JSON.stringify({ error: 'Qiniu credentials not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
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

    return new Response(
      JSON.stringify(signature),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Generate signature error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate upload signature' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}