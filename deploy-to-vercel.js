/**
 * 部署到 Vercel 的辅助脚本
 * 
 * 使用方法：
 * 1. 确保已安装 Vercel CLI：npm install -g vercel
 * 2. 确保已登录 Vercel 账号：vercel login
 * 3. 运行此脚本：node deploy-to-vercel.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 确保必要的目录存在
const dirs = ['templates', 'static', 'uploads', 'results'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// 确保 placeholder.svg 存在
const placeholderPath = path.join('static', 'img', 'placeholder.svg');
if (!fs.existsSync(path.dirname(placeholderPath))) {
  fs.mkdirSync(path.dirname(placeholderPath), { recursive: true });
}

if (!fs.existsSync(placeholderPath)) {
  const placeholderSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" version="1.1" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#f0f0f0"/>
    <g fill="#999">
        <path d="M82,88 h36 v24 h-36 z"/>
        <circle cx="100" cy="76" r="16"/>
    </g>
    <text x="100" y="140" text-anchor="middle" fill="#666" font-family="Arial" font-size="14">Image Placeholder</text>
</svg>`;
  
  fs.writeFileSync(placeholderPath, placeholderSvg);
  console.log(`Created placeholder SVG: ${placeholderPath}`);
}

// 部署到 Vercel
console.log('Deploying to Vercel...');
try {
  execSync('vercel --prod', { stdio: 'inherit' });
  console.log('Deployment successful!');
} catch (error) {
  console.error('Deployment failed:', error);
  process.exit(1);
}
