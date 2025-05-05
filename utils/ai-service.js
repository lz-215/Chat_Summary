/**
 * AI服务模块 - 提供与大模型API的集成
 * 支持DeepSeek API
 */

const axios = require('axios');
require('dotenv').config();

// 导入DeepSeek API服务
const deepseekApiService = require('./deepseek-api-service');

/**
 * 使用AI生成聊天摘要
 * @param {Array} messages - 消息数组
 * @param {number} maxLength - 摘要最大长度
 * @returns {Promise<string>} 生成的摘要
 */
async function generateSummaryWithAI(messages, maxLength = 500) {
    try {
        // 只使用DeepSeek API
        const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

        if (deepseekApiKey) {
            // 检查DeepSeek API是否可用
            if (await deepseekApiService.isApiAvailable()) {
                console.log('Using DeepSeek API to generate summary...');
                try {
                    // 使用DeepSeek API生成摘要
                    return await deepseekApiService.generateSummaryWithDeepSeek(messages, maxLength);
                } catch (deepseekApiError) {
                    console.warn('DeepSeek API summary generation failed:', deepseekApiError.message);
                    throw new Error('DeepSeek API summary generation failed. Unable to generate summary.');
                }
            } else {
                throw new Error('DeepSeek API is not available. Unable to generate summary.');
            }
        } else {
            throw new Error('DeepSeek API key not configured. Unable to generate summary.');
        }
    } catch (error) {
        console.error('AI summary generation error:', error);
        throw error;
    }
}

/**
 * 使用AI提取关键事件
 * @param {Array} messages - 消息数组
 * @param {number} limit - 最大事件数量
 * @returns {Promise<Array>} 提取的事件数组
 */
async function extractEventsWithAI(messages, limit = 5) {
    try {
        // 只使用DeepSeek API
        const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

        if (deepseekApiKey) {
            // 检查DeepSeek API是否可用
            if (await deepseekApiService.isApiAvailable()) {
                console.log('Using DeepSeek API to extract events...');
                try {
                    // 使用DeepSeek API提取事件
                    return await deepseekApiService.extractEventsWithDeepSeek(messages, limit);
                } catch (deepseekApiError) {
                    console.warn('DeepSeek API event extraction failed:', deepseekApiError.message);
                    throw new Error('DeepSeek API event extraction failed. Unable to extract events.');
                }
            } else {
                throw new Error('DeepSeek API is not available. Unable to extract events.');
            }
        } else {
            throw new Error('DeepSeek API key not configured. Unable to extract events.');
        }
    } catch (error) {
        console.error('AI event extraction error:', error);
        throw error;
    }
}





module.exports = {
    generateSummaryWithAI,
    extractEventsWithAI
};
