// 简单的Tesseract测试
console.log('🔥 Testing Tesseract OCR module loading...');

try {
  const { createWorker } = require('tesseract.js');
  console.log('✓ Tesseract module loaded successfully');
  console.log('✓ createWorker function available:', typeof createWorker);
  
  // 测试基本导入
  console.log('📋 Module info:');
  console.log('- Module path:', require.resolve('tesseract.js'));
  
  // 尝试创建worker但不初始化（避免网络问题）
  console.log('🔍 Testing basic worker creation...');
  
} catch (error) {
  console.error('✗ Tesseract module loading failed:', error);
}