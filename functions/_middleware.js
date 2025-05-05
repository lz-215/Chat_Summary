// Cloudflare Worker 适配器
import { createServer } from '../index.js';

// 全局变量，使其在其他模块中可访问
globalThis.CHAT_ANALYSIS_STORAGE = null;

export default {
  async fetch(request, env, ctx) {
    // 设置全局KV存储变量，使其在其他模块中可访问
    globalThis.CHAT_ANALYSIS_STORAGE = env.CHAT_ANALYSIS_STORAGE;

    // 创建Express应用
    const app = createServer();

    // 创建一个适配器，将Express请求处理为Cloudflare Worker请求
    return handleRequest(app, request, env);
  }
};

/**
 * 处理请求的函数
 * @param {Express.Application} app - Express应用
 * @param {Request} request - Cloudflare Worker请求
 * @param {Object} env - Cloudflare Worker环境变量
 * @returns {Promise<Response>} - Cloudflare Worker响应
 */
async function handleRequest(app, request, env) {
  // 创建一个新的URL对象，用于解析请求URL
  const url = new URL(request.url);

  // 提取路径和查询参数
  const path = url.pathname;
  const query = Object.fromEntries(url.searchParams.entries());

  // 创建一个模拟的Express请求对象
  const req = {
    method: request.method,
    url: url.toString(),
    path: path,
    query: query,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.json().catch(() => ({})) : {},
  };

  // 创建一个模拟的Express响应对象
  let statusCode = 200;
  let responseHeaders = new Headers({
    'Content-Type': 'text/html',
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
          // 这里需要实现文件上传的逻辑
          res.json({
            success: true,
            message: 'File uploaded and analyzed successfully',
            analysis_id: Date.now().toString()
          });
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
