/**
 * 聊天分析核心模块
 * 提供聊天记录分析功能
 */

const fileParser = require('./file-parser');
const textAnalyzer = require('./text-analyzer');
const storage = require('./cloudflare-storage');
const fs = require('fs');
const path = require('path');

/**
 * 分析聊天文件
 * @param {string|Buffer} fileContent - 聊天文件内容或文件路径
 * @param {string} outputPath - 分析结果输出路径
 * @returns {Object} 分析结果
 */
async function analyzeChat(fileContent, outputPath) {
    try {
        console.log(`Starting chat content analysis`);

        // 检查是否在Cloudflare或Vercel环境中运行
        const isCloudflare = typeof process === 'undefined' || !process.version;
        const isVercel = process.env.VERCEL ? true : false;
        console.log('Environment detection in chat-analyzer:');
        console.log('- isCloudflare:', isCloudflare);
        console.log('- isVercel:', isVercel);

        // 解析聊天文件
        let parseResult;
        let filePath = '';

        if (!isCloudflare && !isVercel && typeof fileContent === 'string' && fs.existsSync(fileContent)) {
            // 如果是文件路径（仅在本地环境中）
            console.log('Processing file from path:', fileContent);
            filePath = fileContent;
            parseResult = fileParser.parseFile(fileContent);
        } else {
            // 如果是文件内容或在Cloudflare/Vercel环境中
            console.log('Processing file from content (Serverless environment)');
            filePath = 'memory_file_' + Date.now();
            parseResult = fileParser.parseContent(fileContent);
        }

        const { messages, metadata } = parseResult;

        console.log(`解析完成，共 ${messages.length} 条消息`);

        // 如果没有消息，返回错误
        if (!messages || messages.length === 0) {
            throw new Error('No messages found in the chat file');
        }

        // 提取所有消息内容
        const allContent = messages.map(msg => msg.content || '').join(' ');

        // 检测语言
        const language = textAnalyzer.detectLanguage(allContent);
        console.log(`检测到聊天语言: ${language}`);

        // 统计分析
        const statistics = analyzeStatistics(messages);

        // 提取关键词
        const keywords = textAnalyzer.extractKeywords(allContent, language, 20);
        console.log('提取关键词完成');

        // 情感分析
        const sentiment = analyzeMessagesSentiment(messages, language);
        console.log('情感分析完成');

        // 生成摘要 (异步)
        let summary;
        try {
            summary = await textAnalyzer.generateSummary(messages, 300);
            console.log('生成摘要完成');
        } catch (error) {
            console.error('生成摘要失败:', error.message);
            summary = `无法生成摘要: ${error.message}`;
        }

        // 提取重要事件 (异步)
        let events;
        try {
            events = await textAnalyzer.extractEvents(messages, 10);
            console.log('提取重要事件完成');
        } catch (error) {
            console.error('提取事件失败:', error.message);
            events = [{
                time: '',
                sender: '',
                content: `无法提取事件: ${error.message}`,
                type: '错误'
            }];
        }

        // 使用之前定义的环境变量

        // 组合分析结果
        const result = {
            id: isCloudflare ? filePath : path.basename(filePath, path.extname(filePath)),
            timestamp: new Date().toISOString(),
            language,
            metadata: {
                ...metadata,
                fileName: isCloudflare ? filePath : path.basename(filePath),
                fileSize: isCloudflare ? (typeof fileContent === 'string' ? fileContent.length : 0) : fs.statSync(filePath).size,
                messageCount: messages.length
            },
            statistics,
            top_keywords: keywords,
            sentiment: {
                overall: sentiment.overall,
                byParticipant: sentiment.byParticipant
            },
            summary,
            events,
            total_messages: messages.length,
            senders: statistics.messageCountByParticipant
        };

        // 保存分析结果
        if (outputPath) {
            try {
                // 使用存储模块保存分析结果
                const analysisId = path.basename(outputPath, '.json');
                await storage.saveAnalysisResult(analysisId, result);
                console.log(`分析结果已保存至: ${outputPath}`);
            } catch (error) {
                console.error('保存分析结果时出错:', error);
            }
        }

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('分析聊天文件时出错:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 统计分析
 * @param {Array} messages - 消息数组
 * @returns {Object} 统计结果
 */
function analyzeStatistics(messages) {
    // 按参与者统计消息数量
    const messageCountByParticipant = {};
    messages.forEach(msg => {
        if (msg.sender) {
            messageCountByParticipant[msg.sender] = (messageCountByParticipant[msg.sender] || 0) + 1;
        }
    });

    // 按日期统计消息数量
    const messageCountByDate = {};
    messages.forEach(msg => {
        if (msg.time) {
            // 尝试提取日期部分
            let dateStr = '';

            // 尝试不同的日期格式
            const dateFormats = [
                /(\d{4}-\d{2}-\d{2})/, // 2023-01-01
                /(\d{4}\/\d{2}\/\d{2})/, // 2023/01/01
                /(\d{4}\.\d{2}\.\d{2})/, // 2023.01.01
                /(\d{4}年\d{1,2}月\d{1,2}日)/, // 2023年1月1日
                /(\d{1,2}\/\d{1,2}\/\d{4})/, // 01/01/2023
                /(\d{1,2}-\d{1,2}-\d{4})/, // 01-01-2023
                /(\d{1,2}\.\d{1,2}\.\d{4})/ // 01.01.2023
            ];

            for (const format of dateFormats) {
                const match = msg.time.match(format);
                if (match) {
                    dateStr = match[1];
                    break;
                }
            }

            // 如果没有匹配到日期，使用整个时间字符串
            if (!dateStr) {
                dateStr = msg.time;
            }

            messageCountByDate[dateStr] = (messageCountByDate[dateStr] || 0) + 1;
        }
    });

    // 计算消息长度统计
    const messageLengths = messages.map(msg => (msg.content || '').length);
    const totalLength = messageLengths.reduce((sum, len) => sum + len, 0);
    const averageLength = totalLength / messages.length;
    const maxLength = Math.max(...messageLengths);
    const minLength = Math.min(...messageLengths);

    // 计算活跃时间段
    const messageCountByHour = {};
    messages.forEach(msg => {
        if (msg.time) {
            // 尝试提取小时
            const hourMatch = msg.time.match(/(\d{1,2})[:时点]/);
            if (hourMatch) {
                const hour = parseInt(hourMatch[1]);
                messageCountByHour[hour] = (messageCountByHour[hour] || 0) + 1;
            }
        }
    });

    // 找出最活跃的时间段
    let mostActiveHour = 0;
    let maxMessages = 0;
    for (const [hour, count] of Object.entries(messageCountByHour)) {
        if (count > maxMessages) {
            mostActiveHour = parseInt(hour);
            maxMessages = count;
        }
    }

    return {
        totalMessages: messages.length,
        messageCountByParticipant,
        messageCountByDate,
        messageLengthStats: {
            average: averageLength,
            max: maxLength,
            min: minLength,
            total: totalLength
        },
        timeStats: {
            mostActiveHour,
            messageCountByHour
        }
    };
}

/**
 * 分析消息情感
 * @param {Array} messages - 消息数组
 * @param {string} language - 语言
 * @returns {Object} 情感分析结果
 */
function analyzeMessagesSentiment(messages, language) {
    // 所有消息的情感得分
    const allScores = [];

    // 按参与者统计情感得分
    const scoresByParticipant = {};

    // 分析每条消息的情感
    messages.forEach(msg => {
        if (!msg.content) return;

        const sentiment = textAnalyzer.analyzeSentiment(msg.content, language);
        const score = sentiment.score;

        allScores.push(score);

        if (msg.sender) {
            if (!scoresByParticipant[msg.sender]) {
                scoresByParticipant[msg.sender] = [];
            }
            scoresByParticipant[msg.sender].push(score);
        }
    });

    // 计算总体情感得分
    const overallScore = allScores.length > 0
        ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
        : 0;

    // 计算每个参与者的平均情感得分
    const sentimentByParticipant = {};
    for (const [participant, scores] of Object.entries(scoresByParticipant)) {
        sentimentByParticipant[participant] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    return {
        overall: overallScore,
        byParticipant: sentimentByParticipant
    };
}

module.exports = {
    analyzeChat
};
