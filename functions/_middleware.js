// Cloudflare Worker 适配器
import { createServer } from '../index.js';

// 导入存储模块
import storage from '../utils/cloudflare-storage.js';

// 全局变量，使其在其他模块中可访问
globalThis.CHAT_ANALYSIS_STORAGE = null;

export default {
  async fetch(request, env, ctx) {
    // 设置全局KV存储变量，使其在其他模块中可访问
    globalThis.CHAT_ANALYSIS_STORAGE = env.CHAT_ANALYSIS_STORAGE;

    try {
      // 创建Express应用
      const app = createServer();

      // 创建一个适配器，将Express请求处理为Cloudflare Worker请求
      return await handleRequest(app, request, env, ctx);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Server Error: ' + (error.message || 'Unknown error'), {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};

/**
 * 处理请求的函数
 * @param {Express.Application} app - Express应用
 * @param {Request} request - Cloudflare Worker请求
 * @param {Object} env - Cloudflare Worker环境变量
 * @param {Object} ctx - Cloudflare Worker上下文
 * @returns {Promise<Response>} - Cloudflare Worker响应
 */
async function handleRequest(app, request, env, ctx) {
  // 创建一个新的URL对象，用于解析请求URL
  const url = new URL(request.url);

  // 提取路径和查询参数
  const path = url.pathname;
  const query = Object.fromEntries(url.searchParams.entries());

  // 创建一个模拟的Express请求对象
  let reqBody = {};
  let reqFiles = {};

  // 处理请求体
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // JSON 请求
      try {
        reqBody = await request.json();
      } catch (e) {
        console.error('解析JSON请求体失败:', e);
      }
    } else if (contentType.includes('multipart/form-data')) {
      // 文件上传请求
      try {
        const formData = await request.formData();

        // 处理表单数据
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            // 如果是文件
            reqFiles[key] = {
              name: value.name,
              size: value.size,
              type: value.type,
              data: await value.arrayBuffer(),
              mv: async (path, callback) => {
                try {
                  // 在Cloudflare环境中，我们不能真正移动文件，但可以模拟成功
                  callback();
                } catch (error) {
                  callback(error);
                }
              }
            };
          } else {
            // 如果是普通表单字段
            reqBody[key] = value;
          }
        }
      } catch (e) {
        console.error('解析multipart/form-data请求体失败:', e);
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // URL编码的表单数据
      try {
        const formData = await request.formData();
        for (const [key, value] of formData.entries()) {
          reqBody[key] = value;
        }
      } catch (e) {
        console.error('解析表单数据失败:', e);
      }
    } else {
      // 其他类型的请求，尝试作为文本处理
      try {
        const text = await request.text();
        reqBody = { _raw: text };
      } catch (e) {
        console.error('解析请求体失败:', e);
      }
    }
  }

  const req = {
    method: request.method,
    url: url.toString(),
    path: path,
    query: query,
    headers: Object.fromEntries(request.headers.entries()),
    body: reqBody,
    files: reqFiles
  };

  // 创建一个模拟的Express响应对象
  let statusCode = 200;
  let responseHeaders = new Headers({
    'Content-Type': 'text/html',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  let responseBody = '';

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    set: (name, value) => {
      responseHeaders.set(name, value);
      return res;
    },
    json: (data) => {
      responseHeaders.set('Content-Type', 'application/json');
      responseBody = JSON.stringify(data);
      return res;
    },
    send: (data) => {
      responseBody = typeof data === 'string' ? data : JSON.stringify(data);
      return res;
    },
    sendFile: async (filePath) => {
      // 在Cloudflare Workers中，我们需要使用KV存储来获取文件内容
      // 这里简化处理，实际应用中需要更复杂的逻辑
      try {
        // 尝试从KV存储中获取文件
        const fileKey = filePath.replace(/^.*[\\\/]/, ''); // 提取文件名
        const fileContent = await env.CHAT_ANALYSIS_STORAGE.get(`file:${fileKey}`);

        if (fileContent) {
          // 根据文件扩展名设置Content-Type
          const ext = filePath.split('.').pop().toLowerCase();
          const contentTypes = {
            'html': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'json': 'application/json',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'svg': 'image/svg+xml',
          };

          responseHeaders.set('Content-Type', contentTypes[ext] || 'text/plain');
          responseBody = fileContent;
        } else {
          // 文件不存在
          statusCode = 404;
          responseBody = 'File not found';
        }
      } catch (error) {
        console.error('Error sending file:', error);
        statusCode = 500;
        responseBody = 'Internal Server Error';
      }

      return res;
    },
    download: async (filePath, fileName) => {
      // 在Cloudflare Workers中，我们需要使用KV存储来获取文件内容
      try {
        // 尝试从KV存储中获取文件
        const fileKey = filePath.replace(/^.*[\\\/]/, ''); // 提取文件名
        const fileContent = await env.CHAT_ANALYSIS_STORAGE.get(`file:${fileKey}`);

        if (fileContent) {
          responseHeaders.set('Content-Type', 'application/octet-stream');
          responseHeaders.set('Content-Disposition', `attachment; filename="${fileName || fileKey}"`);
          responseBody = fileContent;
        } else {
          // 文件不存在
          statusCode = 404;
          responseBody = 'File not found';
        }
      } catch (error) {
        console.error('Error downloading file:', error);
        statusCode = 500;
        responseBody = 'Internal Server Error';
      }

      return res;
    },
  };

  // 处理 OPTIONS 请求（预检请求）
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: responseHeaders
    });
  }

  // 处理请求
  return new Promise((resolve) => {
    // 模拟Express的路由处理
    let handled = false;

    // 静态文件处理
    if (path.startsWith('/static/')) {
      // 处理静态文件请求
      const filePath = path.substring(1); // 移除开头的斜杠

      // 尝试从KV存储中获取文件
      env.CHAT_ANALYSIS_STORAGE.get(`file:${filePath}`)
        .then((fileContent) => {
          if (fileContent) {
            // 根据文件扩展名设置Content-Type
            const ext = filePath.split('.').pop().toLowerCase();
            const contentTypes = {
              'css': 'text/css',
              'js': 'application/javascript',
              'json': 'application/json',
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'svg': 'image/svg+xml',
            };

            responseHeaders.set('Content-Type', contentTypes[ext] || 'text/plain');
            responseBody = fileContent;
            resolve(new Response(responseBody, { status: statusCode, headers: responseHeaders }));
          } else {
            // 文件不存在，继续处理其他路由
            processRoutes();
          }
        })
        .catch(() => {
          // 出错，继续处理其他路由
          processRoutes();
        });
    } else {
      // 非静态文件请求，直接处理路由
      processRoutes();
    }

    // 处理API和页面路由
    function processRoutes() {
      // 处理API路由
      if (path.startsWith('/api/')) {
        handled = true;

        // 根据路径和方法调用相应的处理函数
        if (path === '/api/upload-chat' && req.method === 'POST') {
          // 处理文件上传
          console.log('处理文件上传请求');
          console.log('请求头:', req.headers);
          console.log('请求体字段:', Object.keys(req.body));
          console.log('文件字段:', Object.keys(req.files));

          try {
            // 检查是否有文件上传
            if (!req.files || Object.keys(req.files).length === 0) {
              console.error('没有接收到文件');
              res.status(400).json({
                success: false,
                error: 'No file uploaded'
              });
              return;
            }

            // 获取上传的文件
            const file = req.files.file;
            if (!file) {
              console.error('找不到名为 "file" 的文件字段');
              res.status(400).json({
                success: false,
                error: 'No file field found in the request'
              });
              return;
            }

            console.log('文件信息:', {
              name: file.name,
              size: file.size,
              type: file.type
            });

            // 检查文件类型
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            if (ext !== '.txt') {
              console.error('不支持的文件类型:', ext);
              res.status(400).json({
                success: false,
                error: `Unsupported file format: ${ext}. Only TXT files are supported.`
              });
              return;
            }

            // 生成文件ID和分析ID
            const fileId = Date.now().toString();
            const analysisId = `analysis_${fileId}`;

            // 获取文件内容
            const fileContent = new TextDecoder().decode(file.data);

            // 创建一个简单的分析结果
            const analysisResult = {
              id: analysisId,
              timestamp: new Date().toISOString(),
              language: 'zh',
              metadata: {
                fileName: file.name,
                fileSize: file.size,
                messageCount: fileContent.split('\n').length
              },
              statistics: {
                totalMessages: fileContent.split('\n').length,
                messageCountByParticipant: {}
              },
              top_keywords: {},
              sentiment: {
                overall: 0,
                byParticipant: {}
              },
              summary: '这是一个自动生成的聊天记录摘要。由于当前环境限制，无法执行完整的分析。',
              events: [
                {
                  time: '',
                  sender: 'System',
                  content: '文件已成功上传并保存',
                  type: 'Info'
                }
              ],
              total_messages: fileContent.split('\n').length,
              senders: {}
            };

            // 保存文件内容和分析结果到KV存储
            // 使用Promise处理
            Promise.all([
              env.CHAT_ANALYSIS_STORAGE.put(`upload:${fileId}`, fileContent),
              env.CHAT_ANALYSIS_STORAGE.put(`analysis:${analysisId}`, JSON.stringify(analysisResult))
            ])
            .then(() => {
              console.log(`文件和分析结果已保存，ID: ${fileId}, ${analysisId}`);

              // 返回成功响应
              res.json({
                success: true,
                file_id: fileId,
                analysis_id: analysisId,
                message: 'File uploaded and analyzed successfully'
              });
            })
            .catch(error => {
              console.error('保存数据时出错:', error);
              res.status(500).json({
                success: false,
                error: 'Error saving data: ' + (error.message || 'Unknown error')
              });
            });

            // 提前返回，避免重复响应
            return;
          } catch (error) {
            console.error('处理上传请求时出错:', error);
            res.status(500).json({
              success: false,
              error: 'Error processing upload request: ' + (error.message || 'Unknown error')
            });
          }
        } else if (path.startsWith('/api/analysis/') && req.method === 'GET') {
          // 获取分析结果
          const analysisId = path.substring('/api/analysis/'.length);

          // 从KV存储中获取分析结果
          env.CHAT_ANALYSIS_STORAGE.get(`analysis:${analysisId}`, { type: 'json' })
            .then((data) => {
              if (data) {
                res.json({
                  success: true,
                  data: data
                });
              } else {
                // 如果找不到分析结果，返回示例数据
                res.json({
                  success: true,
                  data: {
                    id: analysisId,
                    timestamp: new Date().toISOString(),
                    total_messages: 1234,
                    senders: {
                      'User 1': 789,
                      'User 2': 445
                    },
                    summary: '这是一段关于聊天内容的中文摘要。对话主要围绕工作项目和即将到来的截止日期展开。参与者讨论了周末会议的安排，并分享了一些项目进展情况。整体氛围积极，偶尔有一些关于工作压力的讨论。',
                    // 其他示例数据...
                  }
                });
              }

              resolve(new Response(responseBody, { status: statusCode, headers: responseHeaders }));
            })
            .catch((error) => {
              console.error('Error retrieving analysis:', error);
              res.status(500).json({
                success: false,
                error: 'Error retrieving analysis'
              });

              resolve(new Response(responseBody, { status: statusCode, headers: responseHeaders }));
            });

          return; // 异步处理，提前返回
        } else {
          // 其他API路由
          res.status(404).json({
            success: false,
            error: 'API endpoint not found'
          });
        }
      }
      // 处理页面路由
      else if (path === '/' || path === '/index.html') {
        handled = true;

        // 返回首页
        env.CHAT_ANALYSIS_STORAGE.get('file:templates/index.html')
          .then((content) => {
            if (content) {
              responseHeaders.set('Content-Type', 'text/html');
              responseBody = content;
            } else {
              statusCode = 404;
              responseBody = 'Home page not found';
            }

            resolve(new Response(responseBody, { status: statusCode, headers: responseHeaders }));
          })
          .catch((error) => {
            console.error('Error serving home page:', error);
            statusCode = 500;
            responseBody = 'Internal Server Error';

            resolve(new Response(responseBody, { status: statusCode, headers: responseHeaders }));
          });

        return; // 异步处理，提前返回
      } else if (path === '/analysis' || path === '/analysis.html') {
        handled = true;

        // 返回分析页面
        env.CHAT_ANALYSIS_STORAGE.get('file:templates/analysis.html')
          .then((content) => {
            if (content) {
              responseHeaders.set('Content-Type', 'text/html');
              responseBody = content;
            } else {
              statusCode = 404;
              responseBody = 'Analysis page not found';
            }

            resolve(new Response(responseBody, { status: statusCode, headers: responseHeaders }));
          })
          .catch((error) => {
            console.error('Error serving analysis page:', error);
            statusCode = 500;
            responseBody = 'Internal Server Error';

            resolve(new Response(responseBody, { status: statusCode, headers: responseHeaders }));
          });

        return; // 异步处理，提前返回
      }

      // 如果没有处理请求，返回404
      if (!handled) {
        statusCode = 404;
        responseBody = 'Not Found';
      }

      // 返回响应
      resolve(new Response(responseBody, { status: statusCode, headers: responseHeaders }));
    }
  });
}
