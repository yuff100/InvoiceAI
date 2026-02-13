// 完整OCR测试流程
const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');

async function testOCR() {
  const imagePath = path.join(__dirname, 'test/322248502.jpg');
  console.log('1. 读取图片:', imagePath);
  
  // 读取原始图片
  const imageBuffer = fs.readFileSync(imagePath);
  console.log('2. 原始大小:', imageBuffer.length);
  
  // 简单压缩 - 通过调整图片尺寸
  // 使用canvas或sharp更好，但这里简单处理
  // 直接使用原始图片测试
  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64}`;
  console.log('3. Base64长度:', dataUrl.length);
  
  if (dataUrl.length > 500000) {
    console.log('4. 图片太大，需要压缩...');
    // 跳过测试，返回
    console.log('错误: 图片太大');
    process.exit(1);
  }
  
  // 测试OCR
  console.log('5. 创建Worker...');
  const worker = await createWorker('chi_sim');
  
  console.log('6. 开始OCR...');
  const result = await worker.recognize(dataUrl);
  
  console.log('\n=== OCR结果 ===');
  console.log('置信度:', result.data.confidence);
  console.log('识别文本:', result.data.text);
  
  await worker.terminate();
  
  process.exit(0);
}

testOCR().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});