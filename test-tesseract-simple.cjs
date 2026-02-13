// 简单的Tesseract测试脚本
const { createWorker } = require('tesseract.js');

async function test() {
  console.log('开始测试Tesseract...');
  
  try {
    console.log('创建worker...');
    const worker = await createWorker('chi_sim');
    console.log('Worker创建成功');
    
    // 使用一个简单的白色图片
    const testBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    console.log('开始识别...');
    const result = await worker.recognize(testBase64);
    console.log('识别完成, 文本长度:', result.data.text.length);
    console.log('识别文本:', result.data.text);
    console.log('置信度:', result.data.confidence);
    
    await worker.terminate();
    console.log('测试成功');
  } catch (error) {
    console.error('测试失败:', error.message);
  }
  
  process.exit(0);
}

test();