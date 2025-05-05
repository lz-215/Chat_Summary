/**
 * 文件解析工具
 * 支持HTML和TXT格式的聊天记录解析
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const chardet = require('chardet');

/**
 * 检测文件编码
 * @param {string} filePath - 文件路径
 * @returns {string} 文件编码
 */
function detectEncoding(filePath) {
    try {
        // 读取文件的前10KB来检测编码
        const buffer = Buffer.alloc(10240);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 10240, 0);
        fs.closeSync(fd);

        // 使用chardet检测编码
        const encoding = chardet.detect(buffer);
        return encoding || 'utf-8';
    } catch (error) {
        console.error('Error detecting file encoding:', error);
        return 'utf-8'; // 默认使用UTF-8
    }
}

/**
 * 解析聊天文件
 * @param {string} filePath - 文件路径
 * @returns {Object} 解析结果，包含消息数组和元数据
 */
function parseFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    // 检测文件编码
    const encoding = detectEncoding(filePath);
    console.log(`Detected file encoding: ${encoding}`);

    if (ext === '.html' || ext === '.htm') {
        return parseHtmlFile(filePath, encoding);
    } else if (ext === '.txt') {
        return parseTxtFile(filePath, encoding);
    } else {
        throw new Error(`Unsupported file format: ${ext}`);
    }
}

/**
 * 解析HTML格式的聊天记录
 * @param {string} filePath - 文件路径
 * @param {string} encoding - 文件编码
 * @returns {Object} 解析结果
 */
function parseHtmlFile(filePath, encoding) {
    try {
        // 读取文件内容
        const buffer = fs.readFileSync(filePath);
        const content = iconv.decode(buffer, encoding);

        // 使用cheerio解析HTML
        const $ = cheerio.load(content);

        // 尝试识别聊天平台
        const platform = detectPlatform($);

        // 根据不同平台使用不同的解析策略
        let messages = [];
        let metadata = {
            platform,
            title: $('title').text() || path.basename(filePath),
            exportDate: new Date().toISOString()
        };

        if (platform === 'wechat') {
            const result = parseWeChatHtml($);
            messages = result.messages;
            metadata = { ...metadata, ...result.metadata };
        } else if (platform === 'whatsapp') {
            const result = parseWhatsAppHtml($);
            messages = result.messages;
            metadata = { ...metadata, ...result.metadata };
        } else {
            // 通用HTML解析策略
            messages = parseGenericHtml($);
        }

        return {
            messages,
            metadata
        };
    } catch (error) {
        console.error('Error parsing HTML file:', error);
        throw new Error(`Failed to parse HTML file: ${error.message}`);
    }
}

/**
 * 解析TXT格式的聊天记录
 * @param {string} filePath - 文件路径
 * @param {string} encoding - 文件编码
 * @returns {Object} 解析结果
 */
function parseTxtFile(filePath, encoding) {
    try {
        // 读取文件内容
        const buffer = fs.readFileSync(filePath);
        const content = iconv.decode(buffer, encoding);

        // 按行分割
        const lines = content.split(/\r?\n/);

        // 尝试识别聊天平台和格式
        const platform = detectTxtPlatform(lines);

        // 解析消息
        let messages = [];
        let metadata = {
            platform,
            title: path.basename(filePath),
            exportDate: new Date().toISOString()
        };

        if (platform === 'wechat') {
            const result = parseWeChatTxt(lines);
            messages = result.messages;
            metadata = { ...metadata, ...result.metadata };
        } else if (platform === 'whatsapp') {
            const result = parseWhatsAppTxt(lines);
            messages = result.messages;
            metadata = { ...metadata, ...result.metadata };
        } else {
            // 通用TXT解析策略
            messages = parseGenericTxt(lines);
        }

        return {
            messages,
            metadata
        };
    } catch (error) {
        console.error('Error parsing TXT file:', error);
        throw new Error(`Failed to parse TXT file: ${error.message}`);
    }
}

/**
 * 检测HTML文件的聊天平台
 * @param {Object} $ - Cheerio对象
 * @returns {string} 平台名称
 */
function detectPlatform($) {
    // 检查是否为微信导出的HTML
    if ($('.message').length > 0 && $('.chat_item').length > 0) {
        return 'wechat';
    }

    // 检查是否为WhatsApp导出的HTML
    if ($('.message-out, .message-in').length > 0) {
        return 'whatsapp';
    }

    // 默认为通用格式
    return 'generic';
}

/**
 * 检测TXT文件的聊天平台
 * @param {Array} lines - 文件内容按行分割
 * @returns {string} 平台名称
 */
function detectTxtPlatform(lines) {
    // 检查前10行，寻找平台特征
    const sampleLines = lines.slice(0, Math.min(10, lines.length)).join('\n');

    // 微信特征
    if (sampleLines.includes('微信') || sampleLines.includes('WeChat')) {
        return 'wechat';
    }

    // WhatsApp特征
    if (sampleLines.includes('WhatsApp') || /\[\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}\]/.test(sampleLines)) {
        return 'whatsapp';
    }

    // 默认为通用格式
    return 'generic';
}

/**
 * 解析微信HTML格式
 * @param {Object} $ - Cheerio对象
 * @returns {Object} 解析结果
 */
function parseWeChatHtml($) {
    const messages = [];
    let metadata = {
        chatName: $('.title_wrap .title').text().trim(),
        participants: new Set()
    };

    // 解析消息
    $('.message').each((i, el) => {
        const $msg = $(el);
        const sender = $msg.find('.nickname').text().trim();
        const time = $msg.find('.time').text().trim();
        const content = $msg.find('.content').text().trim();

        if (sender) {
            metadata.participants.add(sender);
        }

        messages.push({
            sender,
            time,
            content,
            type: 'text'
        });
    });

    // 转换参与者集合为数组
    metadata.participants = Array.from(metadata.participants);

    return {
        messages,
        metadata
    };
}

/**
 * 解析WhatsApp HTML格式
 * @param {Object} $ - Cheerio对象
 * @returns {Object} 解析结果
 */
function parseWhatsAppHtml($) {
    const messages = [];
    let metadata = {
        chatName: $('header .chat-title').text().trim(),
        participants: new Set()
    };

    // 解析消息
    $('.message').each((i, el) => {
        const $msg = $(el);
        const isOutgoing = $msg.hasClass('message-out');
        const sender = isOutgoing ? 'You' : $msg.find('.message-author').text().trim();
        const time = $msg.find('.message-datetime').text().trim();
        const content = $msg.find('.message-text').text().trim();

        if (sender) {
            metadata.participants.add(sender);
        }

        messages.push({
            sender,
            time,
            content,
            type: 'text',
            isOutgoing
        });
    });

    // 转换参与者集合为数组
    metadata.participants = Array.from(metadata.participants);

    return {
        messages,
        metadata
    };
}

/**
 * 解析通用HTML格式
 * @param {Object} $ - Cheerio对象
 * @returns {Array} 消息数组
 */
function parseGenericHtml($) {
    const messages = [];

    // 尝试查找消息元素
    // 这里使用一些常见的消息容器类名或标签
    const messageSelectors = [
        '.message', '.msg', '.chat-message',
        '.bubble', '.chat-bubble',
        'div[data-message-id]'
    ];

    let messageElements = $();
    for (const selector of messageSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
            messageElements = elements;
            break;
        }
    }

    // 如果找到了消息元素，尝试提取信息
    if (messageElements.length > 0) {
        messageElements.each((i, el) => {
            const $msg = $(el);

            // 尝试提取发送者
            let sender = '';
            const senderSelectors = ['.sender', '.author', '.name', '.nickname', '.user'];
            for (const selector of senderSelectors) {
                const senderEl = $msg.find(selector);
                if (senderEl.length > 0) {
                    sender = senderEl.text().trim();
                    break;
                }
            }

            // 尝试提取时间
            let time = '';
            const timeSelectors = ['.time', '.timestamp', '.date', '.datetime'];
            for (const selector of timeSelectors) {
                const timeEl = $msg.find(selector);
                if (timeEl.length > 0) {
                    time = timeEl.text().trim();
                    break;
                }
            }

            // 尝试提取内容
            let content = '';
            const contentSelectors = ['.content', '.text', '.body', '.message-text'];
            for (const selector of contentSelectors) {
                const contentEl = $msg.find(selector);
                if (contentEl.length > 0) {
                    content = contentEl.text().trim();
                    break;
                }
            }

            // 如果没有找到内容，使用整个消息元素的文本
            if (!content) {
                content = $msg.text().trim();
            }

            // 只有当有内容时才添加消息
            if (content) {
                messages.push({
                    sender,
                    time,
                    content,
                    type: 'text'
                });
            }
        });
    } else {
        // 如果没有找到消息元素，尝试从文本中提取
        const bodyText = $('body').text();
        const lines = bodyText.split('\n').filter(line => line.trim());

        // 使用正则表达式尝试提取消息
        const messageRegexes = [
            // 时间 + 发送者 + 内容
            /\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (.+?): (.+)/,
            // 发送者 + 时间 + 内容
            /(.+?) \((\d{2}:\d{2}(?::\d{2})?)\): (.+)/,
            // 发送者 + 内容
            /^(.+?): (.+)/
        ];

        for (const line of lines) {
            let matched = false;

            for (const regex of messageRegexes) {
                const match = line.match(regex);
                if (match) {
                    matched = true;
                    if (match.length === 4) { // 时间 + 发送者 + 内容
                        messages.push({
                            time: match[1],
                            sender: match[2],
                            content: match[3],
                            type: 'text'
                        });
                    } else if (match.length === 5) { // 发送者 + 时间 + 内容
                        messages.push({
                            sender: match[1],
                            time: match[2],
                            content: match[4],
                            type: 'text'
                        });
                    } else if (match.length === 3) { // 发送者 + 内容
                        messages.push({
                            sender: match[1],
                            content: match[2],
                            type: 'text'
                        });
                    }
                    break;
                }
            }

            // 如果没有匹配任何格式，将整行作为内容
            if (!matched && line.trim()) {
                messages.push({
                    content: line.trim(),
                    type: 'text'
                });
            }
        }
    }

    return messages;
}

/**
 * 解析微信TXT格式
 * @param {Array} lines - 文件内容按行分割
 * @returns {Object} 解析结果
 */
function parseWeChatTxt(lines) {
    const messages = [];
    const participants = new Set();
    let chatName = '';

    // 尝试从前几行提取聊天名称
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        if (lines[i].includes('聊天记录') || lines[i].includes('Chat History')) {
            chatName = lines[i].trim();
            break;
        }
    }

    // 常见的微信消息格式正则表达式
    const messageRegexes = [
        // 标准格式：2023-05-01 10:30:45 张三: 你好!
        /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (.+?): (.+)$/,
        // 简化格式：10:30:45 张三: 你好!
        /^(\d{2}:\d{2}:\d{2}) (.+?): (.+)$/,
        // 日期格式：2023年5月1日 10:30 张三: 你好!
        /^(\d{4}年\d{1,2}月\d{1,2}日 \d{2}:\d{2}) (.+?): (.+)$/
    ];

    let currentMessage = null;

    for (const line of lines) {
        if (!line.trim()) continue;

        let matched = false;

        for (const regex of messageRegexes) {
            const match = line.match(regex);
            if (match) {
                matched = true;

                // 如果有未完成的消息，先保存
                if (currentMessage) {
                    messages.push(currentMessage);
                    currentMessage = null;
                }

                const time = match[1];
                const sender = match[2];
                const content = match[3];

                participants.add(sender);

                currentMessage = {
                    time,
                    sender,
                    content,
                    type: 'text'
                };

                break;
            }
        }

        // 如果没有匹配任何消息格式，且有当前消息，则视为消息的继续
        if (!matched && currentMessage) {
            currentMessage.content += '\n' + line.trim();
        } else if (!matched && !currentMessage) {
            // 如果没有匹配且没有当前消息，创建一个新消息
            currentMessage = {
                content: line.trim(),
                type: 'text'
            };
        }
    }

    // 保存最后一条消息
    if (currentMessage) {
        messages.push(currentMessage);
    }

    return {
        messages,
        metadata: {
            chatName,
            participants: Array.from(participants)
        }
    };
}

/**
 * 解析WhatsApp TXT格式
 * @param {Array} lines - 文件内容按行分割
 * @returns {Object} 解析结果
 */
function parseWhatsAppTxt(lines) {
    const messages = [];
    const participants = new Set();
    let chatName = '';

    // 尝试从前几行提取聊天名称
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        if (lines[i].includes('WhatsApp Chat with')) {
            chatName = lines[i].trim();
            break;
        }
    }

    // WhatsApp消息格式正则表达式
    // 例如：[12/05/2023, 10:30:45] John Doe: Hello!
    const messageRegex = /^\[(\d{2}\/\d{2}\/\d{4}), (\d{2}:\d{2}(?::\d{2})?)\] (.+?): (.+)$/;

    let currentMessage = null;

    for (const line of lines) {
        if (!line.trim()) continue;

        const match = line.match(messageRegex);
        if (match) {
            // 如果有未完成的消息，先保存
            if (currentMessage) {
                messages.push(currentMessage);
                currentMessage = null;
            }

            const date = match[1];
            const time = match[2];
            const sender = match[4];
            const content = match[5];

            participants.add(sender);

            currentMessage = {
                time: `${date} ${time}`,
                sender,
                content,
                type: 'text'
            };
        } else if (currentMessage) {
            // 如果没有匹配，且有当前消息，则视为消息的继续
            currentMessage.content += '\n' + line.trim();
        }
    }

    // 保存最后一条消息
    if (currentMessage) {
        messages.push(currentMessage);
    }

    return {
        messages,
        metadata: {
            chatName,
            participants: Array.from(participants)
        }
    };
}

/**
 * 解析通用TXT格式
 * @param {Array} lines - 文件内容按行分割
 * @returns {Array} 消息数组
 */
function parseGenericTxt(lines) {
    const messages = [];

    // 常见的消息格式正则表达式
    const messageRegexes = [
        // 时间 + 发送者 + 内容
        /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (.+?): (.+)$/,
        /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (.+?): (.+)$/,
        // 发送者 + 时间 + 内容
        /^(.+?) \((\d{2}:\d{2}(?::\d{2})?)\): (.+)$/,
        // 发送者 + 内容
        /^(.+?): (.+)$/,
        // 仅时间戳
        /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})$/,
        /^(\d{2}:\d{2}:\d{2})$/,
        /^(\d{2}:\d{2})$/
    ];

    // 时间戳正则表达式，用于清理内容中的时间戳
    const timestampRegexes = [
        /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g,
        /\d{2}:\d{2}:\d{2}/g,
        /\d{2}:\d{2}/g
    ];

    let currentMessage = null;

    for (const line of lines) {
        if (!line.trim()) continue;

        // 检查是否只是时间戳行
        let isOnlyTimestamp = false;
        for (let i = 4; i < 7; i++) { // 检查最后三个正则（仅时间戳）
            if (messageRegexes[i].test(line.trim())) {
                isOnlyTimestamp = true;
                break;
            }
        }
        if (isOnlyTimestamp) continue; // 跳过只包含时间戳的行

        let matched = false;

        for (let i = 0; i < 4; i++) { // 只检查前四个正则（包含内容的格式）
            const regex = messageRegexes[i];
            const match = line.match(regex);
            if (match) {
                matched = true;

                // 如果有未完成的消息，先保存
                if (currentMessage) {
                    messages.push(currentMessage);
                    currentMessage = null;
                }

                let content = '';
                let sender = '';

                if (i < 2) { // 时间 + 发送者 + 内容
                    sender = match[2];
                    content = match[3];
                } else if (i === 2) { // 发送者 + 时间 + 内容
                    sender = match[1];
                    content = match[3];
                } else if (i === 3) { // 发送者 + 内容
                    sender = match[1];
                    content = match[2];
                }

                // 清理内容中的时间戳
                timestampRegexes.forEach(regex => {
                    content = content.replace(regex, '');
                });
                content = content.trim();

                if (content) { // 只有当内容不为空时才创建消息
                    currentMessage = {
                        sender,
                        content,
                        type: 'text'
                    };
                }

                break;
            }
        }

        // 如果没有匹配任何消息格式，且有当前消息，则视为消息的继续
        if (!matched && currentMessage) {
            let additionalContent = line.trim();

            // 清理附加内容中的时间戳
            timestampRegexes.forEach(regex => {
                additionalContent = additionalContent.replace(regex, '');
            });
            additionalContent = additionalContent.trim();

            if (additionalContent) {
                currentMessage.content += '\n' + additionalContent;
            }
        } else if (!matched && !currentMessage) {
            // 如果没有匹配且没有当前消息，创建一个新消息
            let content = line.trim();

            // 清理内容中的时间戳
            timestampRegexes.forEach(regex => {
                content = content.replace(regex, '');
            });
            content = content.trim();

            if (content) { // 只有当内容不为空时才创建消息
                currentMessage = {
                    content,
                    type: 'text'
                };
            }
        }
    }

    // 保存最后一条消息
    if (currentMessage) {
        messages.push(currentMessage);
    }

    // 过滤掉空消息
    return messages.filter(msg => msg.content && msg.content.trim());
}

/**
 * 解析聊天内容（字符串或Buffer）
 * @param {string|Buffer} content - 聊天内容
 * @returns {Object} 解析结果，包含消息数组和元数据
 */
function parseContent(content) {
    try {
        // 确保内容是字符串
        let textContent = '';
        if (Buffer.isBuffer(content)) {
            // 如果是Buffer，尝试使用UTF-8解码
            textContent = content.toString('utf8');
        } else if (typeof content === 'string') {
            textContent = content;
        } else {
            throw new Error('Invalid content type. Expected string or Buffer.');
        }

        // 按行分割
        const lines = textContent.split(/\r?\n/);

        // 尝试识别聊天平台和格式
        const platform = detectTxtPlatform(lines);

        // 解析消息
        let messages = [];
        let metadata = {
            platform,
            title: 'Chat Analysis',
            exportDate: new Date().toISOString()
        };

        if (platform === 'wechat') {
            const result = parseWeChatTxt(lines);
            messages = result.messages;
            metadata = { ...metadata, ...result.metadata };
        } else if (platform === 'whatsapp') {
            const result = parseWhatsAppTxt(lines);
            messages = result.messages;
            metadata = { ...metadata, ...result.metadata };
        } else {
            // 通用TXT解析策略
            messages = parseGenericTxt(lines);
        }

        return {
            messages,
            metadata
        };
    } catch (error) {
        console.error('Error parsing content:', error);
        throw new Error(`Failed to parse content: ${error.message}`);
    }
}

module.exports = {
    parseFile,
    parseContent,
    detectEncoding
};
