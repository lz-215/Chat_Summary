/**
 * DeepSeek API服务模块
 * 提供与DeepSeek API的直接集成
 */

const axios = require('axios');
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv配置失败，可能在Serverless环境中运行:', error.message);
}

// DeepSeek API配置
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// 默认模型配置
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// API可用性状态
let apiAvailable = null; // null表示未检测，true表示可用，false表示不可用
let lastApiCheckTime = 0;

/**
 * 快速检测API是否可用
 * @returns {Promise<boolean>} API是否可用
 */
async function isApiAvailable() {
    // 如果没有配置API密钥，直接返回false
    if (!DEEPSEEK_API_KEY) {
        console.log('DeepSeek API key not configured');
        return false;
    }

    const now = Date.now();

    // 在Vercel环境中，假设API总是可用，避免不必要的测试请求
    if (process.env.VERCEL) {
        console.log('Running in Vercel environment, assuming API is available');
        apiAvailable = true;
        lastApiCheckTime = now;
        return true;
    }

    // 如果在过去5分钟内已经检测过，直接返回缓存的结果
    if (apiAvailable !== null && now - lastApiCheckTime < 5 * 60 * 1000) {
        return apiAvailable;
    }

    try {
        console.log('Testing DeepSeek API connection with key:', DEEPSEEK_API_KEY ? `${DEEPSEEK_API_KEY.substring(0, 5)}...` : 'undefined');
        console.log('API URL:', DEEPSEEK_API_URL);
        console.log('Model:', DEFAULT_MODEL);

        // 使用一个简单的请求测试API连接
        const response = await axios.post(
            `${DEEPSEEK_API_URL}/chat/completions`,
            {
                model: DEFAULT_MODEL,
                messages: [
                    { role: 'user', content: 'Hello' }
                ],
                max_tokens: 5
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                },
                timeout: 30000 // 30秒超时
            }
        );

        console.log('DeepSeek API connection successful, response status:', response.status);

        // 更新状态
        apiAvailable = true;
        lastApiCheckTime = now;
        return true;
    } catch (error) {
        console.error('DeepSeek API connection test failed:', error.message);

        // 记录更详细的错误信息
        if (error.response) {
            // 服务器返回了错误状态码
            console.error('Error status:', error.response.status);
            console.error('Error headers:', error.response.headers);
            console.error('Error data:', error.response.data);
        } else if (error.request) {
            // 请求已发送但没有收到响应
            console.error('No response received:', error.request);
        } else {
            // 设置请求时发生错误
            console.error('Request error:', error.message);
        }

        // 更新状态
        apiAvailable = false;
        lastApiCheckTime = now;
        return false;
    }
}

/**
 * 使用DeepSeek API生成聊天摘要
 * @param {Array} messages - 消息数组
 * @param {number} maxLength - 摘要最大长度
 * @returns {Promise<string>} 生成的摘要
 */
async function generateSummaryWithDeepSeek(messages, maxLength = 500) {
    // 首先检查API是否可用
    if (!(await isApiAvailable())) {
        console.log('DeepSeek API is not available, unable to generate summary');
        throw new Error('DeepSeek API is not available');
    }

    try {
        // 准备消息内容
        const messageContent = messages.map(msg => {
            const sender = msg.sender || 'Unknown';
            const content = msg.content || '';
            const time = msg.time || '';
            return `${time} ${sender}: ${content}`;
        }).join('\n');

        // 构建提示
        const prompt = `请对以下聊天记录进行极度精简的总结，只提取核心内容，忽略所有时间戳、问候语等无关信息。

聊天记录：
${messageContent}

要求：
1. 不要使用任何标题或分类（如"会话摘要"、"关键讨论点"等）
2. 直接以要点形式列出最重要的3-5个信息点
3. 每个要点不超过8个汉字
4. 使用短句，省略主语
5. 整个摘要不超过100字
6. 以中文回复

格式示例：
- 讨论电商平台进展
- 确定三个核心功能
- AR功能需专门开发
- 初步设计需两个月
- 下周继续讨论`;

        // 设置超时Promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('API request timeout')), 120000); // 120秒超时
        });

        // 调用DeepSeek API
        console.log('Calling DeepSeek API for summary generation...');
        const apiPromise = axios.post(
            `${DEEPSEEK_API_URL}/chat/completions`,
            {
                model: DEFAULT_MODEL,
                messages: [
                    { role: 'system', content: '你是一个专业的聊天记录分析助手，擅长总结对话内容。' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: Math.min(maxLength, 200),
                temperature: 0.3,
                top_p: 0.8
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                },
                timeout: 60000 // 60秒超时
            }
        );

        // 使用Promise.race竞争，谁先完成就用谁的结果
        console.log('Waiting for DeepSeek API response...');
        const response = await Promise.race([apiPromise, timeoutPromise]);
        console.log('DeepSeek API response received');

        // 返回生成的摘要
        console.log('DeepSeek API summary generation successful');
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('DeepSeek API summary generation error:', error.message);

        // 提供更详细的错误信息
        if (error.response) {
            console.error('Error status:', error.response.status);
            console.error('Error data:', JSON.stringify(error.response.data, null, 2));
            throw new Error(`API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            console.error('No response received:', error.request);
            throw new Error('No response received from API');
        } else {
            throw error;
        }
    }
}

/**
 * 使用DeepSeek API提取关键事件
 * @param {Array} messages - 消息数组
 * @param {number} limit - 最大事件数量
 * @returns {Promise<Array>} 提取的事件数组
 */
async function extractEventsWithDeepSeek(messages, limit = 5) {
    // 首先检查API是否可用
    if (!(await isApiAvailable())) {
        console.log('DeepSeek API is not available, unable to extract events');
        throw new Error('DeepSeek API is not available');
    }

    try {
        // 准备消息内容
        const messageContent = messages.map(msg => {
            const sender = msg.sender || 'Unknown';
            const content = msg.content || '';
            const time = msg.time || '';
            return `${time} ${sender}: ${content}`;
        }).join('\n');

        // 构建提示
        const prompt = `请从以下聊天记录中提取${limit}个关键事件或重要信息。关键事件可能包括：
- 会议安排
- 截止日期
- 任务分配
- 重要决定
- 关键问题

聊天记录：
${messageContent}

请以严格的JSON格式返回结果。你必须返回一个有效的JSON对象，包含一个名为"events"的数组字段。格式如下：

{
  "events": [
    {
      "time": "事件时间（如果有）",
      "sender": "发送者",
      "content": "事件描述",
      "type": "事件类型（如会议、截止日期、任务等）"
    },
    ...
  ]
}

示例输出：
{
  "events": [
    {
      "time": "2023-05-01",
      "sender": "张三",
      "content": "确定项目截止日期为6月30日",
      "type": "截止日期"
    },
    {
      "time": "",
      "sender": "李四",
      "content": "负责UI设计部分",
      "type": "任务分配"
    }
  ]
}

如果找不到足够的事件，请返回尽可能多的有意义的事件。请确保返回的是有效的JSON格式，必须包含"events"数组字段。`;

        // 设置超时Promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('API request timeout')), 120000); // 120秒超时
        });

        // 调用DeepSeek API，启用JSON模式
        console.log('Calling DeepSeek API for event extraction...');
        const apiPromise = axios.post(
            `${DEEPSEEK_API_URL}/chat/completions`,
            {
                model: DEFAULT_MODEL,
                messages: [
                    { role: 'system', content: '你是一个专业的聊天记录分析助手，擅长提取关键事件。你必须返回有效的JSON格式，包含一个名为"events"的数组字段。不要返回任何额外的文本说明，只返回JSON对象。' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 1000,
                temperature: 0.3,
                top_p: 0.95
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                },
                timeout: 60000 // 60秒超时
            }
        );

        // 使用Promise.race竞争，谁先完成就用谁的结果
        console.log('Waiting for DeepSeek API response for event extraction...');
        const response = await Promise.race([apiPromise, timeoutPromise]);
        console.log('DeepSeek API response for event extraction received');

        // 解析返回的JSON
        console.log('DeepSeek API event extraction successful');
        const content = response.data.choices[0].message.content.trim();
        let events = [];

        try {
            console.log('API返回的原始内容:', content);

            // 尝试解析JSON
            const parsedContent = JSON.parse(content);
            console.log('解析后的JSON对象:', JSON.stringify(parsedContent, null, 2));

            // 如果返回的是对象且包含events字段，使用events字段
            if (parsedContent.events && Array.isArray(parsedContent.events)) {
                events = parsedContent.events;
                console.log('从events字段提取事件:', events.length, '个事件');
            }
            // 如果返回的是数组，直接使用
            else if (Array.isArray(parsedContent)) {
                events = parsedContent;
                console.log('直接使用数组:', events.length, '个事件');
            }
            // 其他情况，尝试查找数组字段
            else {
                console.log('尝试查找数组字段...');
                for (const key in parsedContent) {
                    if (Array.isArray(parsedContent[key])) {
                        events = parsedContent[key];
                        console.log(`从字段 ${key} 提取事件:`, events.length, '个事件');
                        break;
                    }
                }

                // 如果仍然没有找到数组，创建一个包含错误信息的事件
                if (events.length === 0) {
                    console.error('无法在返回的JSON中找到事件数组');
                    events = [{
                        time: '',
                        sender: 'System',
                        content: '无法从API响应中提取事件',
                        type: 'Error'
                    }];
                }
            }
        } catch (parseError) {
            console.error('JSON解析错误:', parseError);
            console.error('原始内容:', content);

            // 尝试提取JSON部分
            try {
                // 尝试匹配 {"events": [...]} 格式
                const jsonMatch = content.match(/\{\s*"events"\s*:\s*\[\s*\{.*\}\s*\]\s*\}/s);
                if (jsonMatch) {
                    const extractedJson = jsonMatch[0];
                    console.log('提取到的JSON字符串:', extractedJson);
                    const parsed = JSON.parse(extractedJson);
                    if (parsed.events && Array.isArray(parsed.events)) {
                        events = parsed.events;
                        console.log('成功从提取的JSON中获取事件');
                    }
                } else {
                    // 尝试匹配任何数组 [...] 格式
                    const arrayMatch = content.match(/\[\s*\{.*\}\s*\]/s);
                    if (arrayMatch) {
                        const extractedArray = arrayMatch[0];
                        console.log('提取到的数组字符串:', extractedArray);
                        events = JSON.parse(extractedArray);
                        console.log('成功从提取的数组中获取事件');
                    } else {
                        throw new Error('无法在响应中找到有效的JSON格式');
                    }
                }
            } catch (e) {
                console.error('JSON提取解析错误:', e);
                throw new Error('无法解析返回的JSON: ' + e.message);
            }
        }

        // 确保返回的事件不超过限制
        return events.slice(0, limit).map(event => ({
            time: event.time || '',
            sender: event.sender || '',
            content: event.content || '',
            type: event.type || 'DeepSeek Analysis'
        }));
    } catch (error) {
        console.error('DeepSeek API event extraction error:', error.message);

        // 记录更详细的错误信息
        if (error.response) {
            // 服务器返回了错误状态码
            console.error('错误状态码:', error.response.status);
            console.error('错误响应头:', JSON.stringify(error.response.headers, null, 2));
            console.error('错误响应数据:', JSON.stringify(error.response.data, null, 2));

            // 根据状态码提供更具体的错误信息
            if (error.response.status === 400) {
                throw new Error(`Request failed with status code 400: Invalid request format. ${JSON.stringify(error.response.data)}`);
            } else if (error.response.status === 401) {
                throw new Error('Request failed with status code 401: Authentication failed. Please check your API key.');
            } else if (error.response.status === 429) {
                throw new Error('Request failed with status code 429: Rate limit exceeded. Please try again later.');
            } else {
                throw new Error(`Request failed with status code ${error.response.status}: ${JSON.stringify(error.response.data)}`);
            }
        } else if (error.request) {
            // 请求已发送但没有收到响应
            console.error('未收到响应:', error.request);
            throw new Error('No response received from DeepSeek API. Please check your network connection.');
        } else {
            // 其他错误
            throw error;
        }
    }
}

module.exports = {
    isApiAvailable,
    generateSummaryWithDeepSeek,
    extractEventsWithDeepSeek
};
