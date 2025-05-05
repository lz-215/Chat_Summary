/**
 * DeepSeek API 测试脚本
 * 用于验证 API 密钥和连接是否正常工作
 */

require('dotenv').config({ path: './config/.env' });
const axios = require('axios');

// 从环境变量获取配置
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-reasoner';

console.log('DeepSeek API 测试开始...');
console.log('API URL:', DEEPSEEK_API_URL);
console.log('API Key:', DEEPSEEK_API_KEY ? `${DEEPSEEK_API_KEY.substring(0, 5)}...` : 'undefined');
console.log('Model:', DEEPSEEK_MODEL);

async function testDeepSeekAPI() {
    try {
        console.log('\n发送测试请求...');

        const response = await axios.post(
            `${DEEPSEEK_API_URL}/chat/completions`,
            {
                model: DEEPSEEK_MODEL,
                messages: [
                    { role: 'user', content: 'Hello, please respond with a short greeting.' }
                ],
                max_tokens: 20
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                },
                timeout: 30000 // 30秒超时
            }
        );

        console.log('\n请求成功!');
        console.log('状态码:', response.status);
        console.log('响应头:', JSON.stringify(response.headers, null, 2));
        console.log('响应数据:', JSON.stringify(response.data, null, 2));

        return true;
    } catch (error) {
        console.error('\n请求失败!');

        if (error.response) {
            // 服务器返回了错误状态码
            console.error('错误状态码:', error.response.status);
            console.error('错误响应头:', JSON.stringify(error.response.headers, null, 2));
            console.error('错误响应数据:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            // 请求已发送但没有收到响应
            console.error('未收到响应:', error.request);
        } else {
            // 设置请求时发生错误
            console.error('请求错误:', error.message);
        }

        return false;
    }
}

// 执行测试
testDeepSeekAPI()
    .then(success => {
        if (success) {
            console.log('\nDeepSeek API 测试成功! API 密钥有效且连接正常。');
        } else {
            console.error('\nDeepSeek API 测试失败! 请检查 API 密钥和连接。');
        }
    })
    .catch(err => {
        console.error('\n测试过程中发生未捕获的错误:', err);
    });
