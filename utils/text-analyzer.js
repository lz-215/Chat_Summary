/**
 * 文本分析工具
 * 提供关键词提取、情感分析等功能
 */

const natural = require('natural');
const { WordTokenizer, SentimentAnalyzer, PorterStemmer } = natural;
const tokenizer = new WordTokenizer();
const stopwords = require('./stopwords');

// 初始化情感分析器
const sentimentAnalyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');

/**
 * 检测文本语言
 * @param {string} text - 要分析的文本
 * @returns {string} 语言代码 ('en', 'zh', 'unknown')
 */
function detectLanguage(text) {
    // 简单的语言检测逻辑
    // 检查中文字符的比例
    const chineseChars = text.match(/[\\u4e00-\\u9fa5]/g) || [];
    const chineseRatio = chineseChars.length / text.length;

    if (chineseRatio > 0.1) {
        return 'zh';
    }

    // 检查英文单词的比例
    const englishWords = text.match(/[a-zA-Z]+/g) || [];
    const englishRatio = englishWords.join('').length / text.length;

    if (englishRatio > 0.5) {
        return 'en';
    }

    return 'unknown';
}

/**
 * 提取关键词
 * @param {string} text - 要分析的文本
 * @param {string} language - 文本语言
 * @param {number} limit - 返回的关键词数量
 * @returns {Object} 关键词及其频率
 */
function extractKeywords(text, language = 'auto', limit = 10) {
    // 如果语言为auto，自动检测语言
    if (language === 'auto') {
        language = detectLanguage(text);
    }

    // 根据不同语言使用不同的分词方法
    let words = [];
    let wordFreq = {};

    if (language === 'zh') {
        // 简单的中文关键词提取（不使用jieba）
        // 按字符分割，然后组合成2-4个字符的词组
        const chars = text.split('');
        const phrases = new Set();

        // 生成2-4字词组
        for (let i = 0; i < chars.length - 1; i++) {
            for (let len = 2; len <= 4 && i + len <= chars.length; len++) {
                const phrase = chars.slice(i, i + len).join('');
                if (!/[，。！？,.!?]/.test(phrase)) { // 排除包含标点的词组
                    phrases.add(phrase);
                }
            }
        }

        // 计算词频
        const phraseFreq = {};
        Array.from(phrases).forEach(phrase => {
            let count = 0;
            let pos = text.indexOf(phrase);
            while (pos !== -1) {
                count++;
                pos = text.indexOf(phrase, pos + 1);
            }
            if (count > 1) { // 只保留出现多次的词组
                phraseFreq[phrase] = count;
            }
        });

        // 按频率排序并限制数量
        const sortedPhrases = Object.entries(phraseFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);

        // 转换回对象
        const result = {};
        sortedPhrases.forEach(([phrase, freq]) => {
            result[phrase] = freq;
        });

        return result;
    } else {
        // 英文或其他语言使用自然语言处理库
        words = tokenizer.tokenize(text.toLowerCase());

        // 过滤停用词和非单词字符
        words = words.filter(word => {
            return word.length > 1 &&
                   !stopwords.english.includes(word) &&
                   !/^\d+$/.test(word) &&
                   !/^[^a-zA-Z0-9]+$/.test(word);
        });

        // 计算词频
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });

        // 按频率排序并限制数量
        const sortedWords = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);

        // 转换回对象
        const result = {};
        sortedWords.forEach(([word, freq]) => {
            result[word] = freq;
        });

        return result;
    }
}

/**
 * 分析情感
 * @param {string} text - 要分析的文本
 * @param {string} language - 文本语言
 * @returns {Object} 情感分析结果
 */
function analyzeSentiment(text, language = 'auto') {
    // 如果语言为auto，自动检测语言
    if (language === 'auto') {
        language = detectLanguage(text);
    }

    if (language === 'zh') {
        // 中文情感分析
        // 这里使用简单的关键词匹配方法
        // 在实际应用中，应该使用更复杂的模型
        const positiveWords = [
            '好', '棒', '赞', '喜欢', '爱', '开心', '高兴', '快乐',
            '优秀', '出色', '满意', '感谢', '谢谢', '感恩', '希望',
            '期待', '加油', '支持', '鼓励', '祝福', '恭喜', '欢迎'
        ];

        const negativeWords = [
            '不', '坏', '差', '糟', '烂', '讨厌', '恨', '难过', '伤心',
            '失望', '遗憾', '抱歉', '对不起', '可惜', '担心', '焦虑',
            '害怕', '恐惧', '生气', '愤怒', '不满', '抱怨', '批评'
        ];

        let positiveScore = 0;
        let negativeScore = 0;

        // 计算正面词汇出现次数
        positiveWords.forEach(word => {
            const regex = new RegExp(word, 'g');
            const matches = text.match(regex);
            if (matches) {
                positiveScore += matches.length;
            }
        });

        // 计算负面词汇出现次数
        negativeWords.forEach(word => {
            const regex = new RegExp(word, 'g');
            const matches = text.match(regex);
            if (matches) {
                negativeScore += matches.length;
            }
        });

        // 计算总分和情感倾向
        const totalScore = positiveScore - negativeScore;
        const normalizedScore = totalScore / (positiveScore + negativeScore) || 0;

        return {
            score: normalizedScore,
            comparative: normalizedScore,
            positive: positiveScore,
            negative: negativeScore,
            language: 'zh'
        };
    } else {
        // 英文情感分析
        const tokens = tokenizer.tokenize(text.toLowerCase());
        const sentiment = sentimentAnalyzer.getSentiment(tokens);

        return {
            score: sentiment,
            comparative: sentiment,
            language: 'en'
        };
    }
}

/**
 * 生成文本摘要
 * @param {Array} messages - 消息数组
 * @param {number} maxLength - 摘要最大长度
 * @returns {Promise<string>} 生成的摘要
 */
async function generateSummary(messages, maxLength = 300) {
    // 导入DeepSeek API服务
    const deepseekApiService = require('./deepseek-api-service');

    try {
        // 检查是否配置了DeepSeek API密钥
        const apiKey = process.env.DEEPSEEK_API_KEY;

        if (apiKey) {
            console.log('Using DeepSeek API to generate summary...');
            try {
                return await deepseekApiService.generateSummaryWithDeepSeek(messages, maxLength);
            } catch (apiError) {
                console.error('DeepSeek API summary generation failed:', apiError);
                return `无法生成摘要: API调用失败 (${apiError.message})`;
            }
        } else {
            console.error('DeepSeek API key not configured');
            return `无法生成摘要: API密钥未配置`;
        }
    } catch (error) {
        console.error('Summary generation error:', error);
        return `无法生成摘要: ${error.message}`;
    }
}

/**
 * 提取重要事件
 * @param {Array} messages - 消息数组
 * @param {number} limit - 返回的事件数量
 * @returns {Promise<Array>} 重要事件数组
 */
async function extractEvents(messages, limit = 5) {
    // 导入DeepSeek API服务
    const deepseekApiService = require('./deepseek-api-service');

    try {
        // 检查是否配置了DeepSeek API密钥
        const apiKey = process.env.DEEPSEEK_API_KEY;

        if (apiKey) {
            console.log('Using DeepSeek API to extract events...');
            try {
                return await deepseekApiService.extractEventsWithDeepSeek(messages, limit);
            } catch (apiError) {
                console.error('DeepSeek API event extraction failed:', apiError);
                return [{
                    time: '',
                    sender: 'System',
                    content: `无法提取事件: API调用失败 (${apiError.message})`,
                    type: 'Error'
                }];
            }
        } else {
            console.error('DeepSeek API key not configured');
            return [{
                time: '',
                sender: 'System',
                content: '无法提取事件: API密钥未配置',
                type: 'Error'
            }];
        }
    } catch (error) {
        console.error('Event extraction error:', error);
        return [{
            time: '',
            sender: 'System',
            content: `无法提取事件: ${error.message}`,
            type: 'Error'
        }];
    }
}

/**
 * 分析热点话题
 * @param {Array} messages - 消息数组
 * @param {string} language - 聊天语言 (可能用于提示)
 * @returns {Promise<Array>} 热点话题对象数组 [{ title, category, summary, keywords, messageCount }, ...]
 */
async function analyzeHotTopics(messages, language = 'auto') {
    // 返回一个简单的占位符话题
    // 由于当前不需要这个功能，我们简化它以避免不必要的API调用
    return [{
        title: "聊天主题",
        category: "一般",
        summary: "聊天记录的主要内容",
        keywords: [],
        messageCount: messages.length
    }];
}

module.exports = {
    detectLanguage,
    extractKeywords,
    analyzeSentiment,
    generateSummary,
    extractEvents,
    analyzeHotTopics
};
