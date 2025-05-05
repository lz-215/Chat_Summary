/**
 * 将静态文件和模板文件上传到Cloudflare KV存储
 * 
 * 使用方法：
 * 1. 确保已安装wrangler CLI工具：npm install -g wrangler
 * 2. 确保已登录Cloudflare账号：wrangler login
 * 3. 运行此脚本：node upload-to-cloudflare.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// KV命名空间ID，从wrangler.toml中获取
const KV_NAMESPACE_ID = '94bb588f7514891b5f6ea569af482c08';

// 要上传的目录
const DIRECTORIES = [
  { path: 'templates', prefix: 'file:templates/' },
  { path: 'static', prefix: 'file:static/' }
];

/**
 * 递归获取目录中的所有文件
 * @param {string} dir - 目录路径
 * @param {Array} fileList - 文件列表
 * @returns {Array} - 文件列表
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * 上传文件到Cloudflare KV存储
 * @param {string} filePath - 文件路径
 * @param {string} key - KV存储键
 */
function uploadFile(filePath, key) {
  try {
    console.log(`上传文件: ${filePath} -> ${key}`);
    
    // 使用wrangler CLI上传文件
    const command = `wrangler kv:key put --binding=CHAT_ANALYSIS_STORAGE "${key}" "${filePath}" --path`;
    execSync(command, { stdio: 'inherit' });
    
    console.log(`上传成功: ${key}`);
  } catch (error) {
    console.error(`上传失败: ${key}`, error);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('开始上传文件到Cloudflare KV存储...');
  
  // 遍历目录
  for (const dir of DIRECTORIES) {
    console.log(`处理目录: ${dir.path}`);
    
    // 获取目录中的所有文件
    const files = getAllFiles(dir.path);
    
    // 上传文件
    for (const file of files) {
      // 计算相对路径
      const relativePath = path.relative(dir.path, file).replace(/\\/g, '/');
      
      // 计算KV存储键
      const key = `${dir.prefix}${relativePath}`;
      
      // 上传文件
      uploadFile(file, key);
    }
  }
  
  console.log('文件上传完成！');
}

// 执行主函数
main().catch(error => {
  console.error('上传过程中出错:', error);
  process.exit(1);
});
