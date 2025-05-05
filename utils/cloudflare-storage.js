/**
 * Cloudflare存储处理模块
 * 
 * 这个模块提供了在Cloudflare Workers环境和本地环境中统一的存储接口
 * 在Cloudflare环境中使用KV存储，在本地环境中使用文件系统
 */

// 检查是否在Cloudflare环境中运行
const isCloudflare = typeof globalThis.CHAT_ANALYSIS_STORAGE !== 'undefined';

/**
 * 保存分析结果
 * @param {string} analysisId - 分析ID
 * @param {Object} data - 分析数据
 * @returns {Promise<void>}
 */
async function saveAnalysisResult(analysisId, data) {
  if (isCloudflare) {
    // 在Cloudflare环境中使用KV存储
    await CHAT_ANALYSIS_STORAGE.put(`analysis:${analysisId}`, JSON.stringify(data));
  } else {
    // 在本地环境中使用文件系统
    const fs = require('fs');
    const path = require('path');
    const resultsDir = path.join(__dirname, '..', 'results');
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(resultsDir, `${analysisId}.json`),
      JSON.stringify(data),
      'utf8'
    );
  }
}

/**
 * 获取分析结果
 * @param {string} analysisId - 分析ID
 * @returns {Promise<Object|null>} - 分析数据或null（如果不存在）
 */
async function getAnalysisResult(analysisId) {
  if (isCloudflare) {
    // 在Cloudflare环境中使用KV存储
    const data = await CHAT_ANALYSIS_STORAGE.get(`analysis:${analysisId}`, { type: 'json' });
    return data;
  } else {
    // 在本地环境中使用文件系统
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'results', `${analysisId}.json`);
    
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    
    return null;
  }
}

/**
 * 保存上传的文件
 * @param {string} fileId - 文件ID
 * @param {string|Buffer} content - 文件内容
 * @returns {Promise<void>}
 */
async function saveUploadedFile(fileId, content) {
  if (isCloudflare) {
    // 在Cloudflare环境中使用KV存储
    await CHAT_ANALYSIS_STORAGE.put(`upload:${fileId}`, content.toString());
  } else {
    // 在本地环境中使用文件系统
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(uploadsDir, fileId),
      content,
      'utf8'
    );
  }
}

/**
 * 获取上传的文件
 * @param {string} fileId - 文件ID
 * @returns {Promise<string|null>} - 文件内容或null（如果不存在）
 */
async function getUploadedFile(fileId) {
  if (isCloudflare) {
    // 在Cloudflare环境中使用KV存储
    const content = await CHAT_ANALYSIS_STORAGE.get(`upload:${fileId}`);
    return content;
  } else {
    // 在本地环境中使用文件系统
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'uploads', fileId);
    
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    
    return null;
  }
}

/**
 * 保存HTML导出文件
 * @param {string} exportId - 导出ID
 * @param {string} content - HTML内容
 * @returns {Promise<void>}
 */
async function saveHtmlExport(exportId, content) {
  if (isCloudflare) {
    // 在Cloudflare环境中使用KV存储
    await CHAT_ANALYSIS_STORAGE.put(`export:${exportId}`, content);
  } else {
    // 在本地环境中使用文件系统
    const fs = require('fs');
    const path = require('path');
    const exportsDir = path.join(__dirname, '..', 'results');
    
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(exportsDir, `${exportId}.html`),
      content,
      'utf8'
    );
  }
}

/**
 * 获取HTML导出文件
 * @param {string} exportId - 导出ID
 * @returns {Promise<string|null>} - HTML内容或null（如果不存在）
 */
async function getHtmlExport(exportId) {
  if (isCloudflare) {
    // 在Cloudflare环境中使用KV存储
    const content = await CHAT_ANALYSIS_STORAGE.get(`export:${exportId}`);
    return content;
  } else {
    // 在本地环境中使用文件系统
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'results', `${exportId}.html`);
    
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    
    return null;
  }
}

module.exports = {
  saveAnalysisResult,
  getAnalysisResult,
  saveUploadedFile,
  getUploadedFile,
  saveHtmlExport,
  getHtmlExport
};
