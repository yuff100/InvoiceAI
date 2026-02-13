// 简单OCR测试
const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');

async function testOCR() {
  const imagePath = path.join(__dirname, 'test/322248502.jpg');
  console.log('读取图片:', imagePath);
  
  const imageBuffer = fs.readFileSync(imagePath);
  console.log('图片大小:', imageBuffer.length);
  
  // 转base64
  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64}`;
  console.log('DataURL长度:', dataUrl.length);
  
  // 测试OCR
  console.log('创建Worker...');
  const worker = await createWorker('chi_sim');
  
  console.log('开始OCR识别...');
  const result = await worker.recognize(dataUrl);
  
  console.log('\n=== OCR结果 ===');
  console.log('识别文本长度:', result.data.text.length);
  console.log('置信度:', result.data.confidence);
  console.log('识别文本:\n', result.data.text);
  
  await worker.terminate();
  console.log('\n完成!');
  
  process.exit(0);
}

testOCR().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});