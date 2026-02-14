require('dotenv').config();

const apiKey = process.env.ZHIPU_API_KEY;

const INVOICE_PROMPT = `请按下列JSON格式输出图中发票信息，不要输出其他内容:
{
    "invoiceCode": "发票代码",
    "invoiceNumber": "发票号码",
    "invoiceDate": "开票日期(格式: YYYY-MM-DD)",
    "sellerName": "销售方名称",
    "sellerTaxNumber": "销售方纳税人识别号",
    "buyerName": "购买方名称",
    "buyerTaxNumber": "购买方纳税人识别号",
    "totalSum": "金额合计(不含税)",
    "taxAmount": "税额合计",
    "totalAmount": "价税合计",
    "items": [
        {
            "name": "项目名称",
            "quantity": "数量",
            "unitPrice": "单价",
            "amount": "金额",
            "taxRate": "税率",
            "taxAmount": "税额"
        }
    ],
    "checkCode": "校验码"
}`;

// 测试：使用网络图片URL
const testImageUrl = 'https://cdn.bigmodel.cn/static/logo/introduction.png';

async function testWithURL() {
  console.log('=== Test 1: Using URL ===');
  console.log('📷 Image URL:', testImageUrl);
  console.log('🔑 API Key:', apiKey?.substring(0, 20) + '...');

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'glm-4v-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: testImageUrl }
            },
            {
              type: 'text',
              text: '请描述图片中的内容'
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    })
  });

  console.log('🔍 Status:', response.status);
  console.log('🔍 Headers:', Object.fromEntries(response.headers.entries()));

  const result = await response.json();
  console.log('📄 Result:', JSON.stringify(result, null, 2));
}

// 测试：使用base64（模拟前端发送的数据）
async function testWithBase64() {
  console.log('\n=== Test 2: Using Base64 ===');

  const imageResponse = await fetch(testImageUrl);
  const buffer = await imageResponse.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  console.log('📷 Image URL:', testImageUrl);
  console.log('📏 Base64 length:', base64.length, 'characters');
  console.log('🔑 API Key:', apiKey?.substring(0, 20) + '...');
  console.log('🔗 Data URI prefix: data:image/png;base64,'.length + ' chars');

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'glm-4v-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64}`
              }
            },
            {
              type: 'text',
              text: '请描述图片中的内容'
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    })
  });

  console.log('🔍 Status:', response.status);
  const result = await response.json();
  console.log('📄 Result:', JSON.stringify(result, null, 2));
}

async function main() {
  try {
    await testWithURL();
    await testWithBase64();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main();
