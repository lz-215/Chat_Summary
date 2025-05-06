require('dotenv').config({ path: './config/.env' });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const chatAnalyzer = require('./utils/chat-analyzer');
const visualizationService = require('./utils/visualization-service');
const htmlExportService = require('./utils/html-export-service');

// 导入路由

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 确保必要的目录存在
const uploadsDir = path.join(__dirname, 'uploads');
const resultsDir = path.join(__dirname, 'results');
const tmpDir = path.join(__dirname, 'tmp');

// 创建目录（如果不存在）
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

console.log('目录检查完成:');
console.log('- 上传目录:', uploadsDir);
console.log('- 结果目录:', resultsDir);
console.log('- 临时目录:', tmpDir);

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // 日志

// 文件上传中间件配置
app.use(fileUpload({
    createParentPath: true,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max file size
    },
    abortOnLimit: true, // 超过大小限制时中止请求
    responseOnLimit: "文件大小超过限制（最大50MB）",
    useTempFiles: true, // 使用临时文件而不是内存
    tempFileDir: './tmp/', // 临时文件目录
    debug: true, // 启用调试模式
    uploadTimeout: 120000, // 上传超时时间（毫秒）
    safeFileNames: true, // 安全文件名
    preserveExtension: true // 保留文件扩展名
}));

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/templates', express.static(path.join(__dirname, 'templates')));

// API路由
app.post('/api/upload-chat', (req, res) => {
    console.log('收到文件上传请求');
    console.log('请求头:', req.headers);

    // 设置响应超时时间
    req.setTimeout(120000); // 120秒
    res.setTimeout(120000); // 120秒

    try {
        // 检查是否有文件上传
        if (!req.files) {
            console.error('没有接收到文件对象: req.files 为空');
            return res.status(400).json({
                success: false,
                error: 'No files object received'
            });
        }

        if (Object.keys(req.files).length === 0) {
            console.error('没有上传文件: req.files 为空对象');
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        console.log('接收到的文件字段:', Object.keys(req.files));

        if (!req.files.file) {
            console.error('找不到名为 "file" 的文件字段');
            return res.status(400).json({
                success: false,
                error: 'No file field found in the request'
            });
        }

        const file = req.files.file;
        console.log('文件信息:', {
            name: file.name,
            size: file.size,
            mimetype: file.mimetype,
            md5: file.md5,
            encoding: file.encoding
        });

        // 检查文件类型
        const ext = path.extname(file.name).toLowerCase();
        if (ext !== '.html' && ext !== '.htm' && ext !== '.txt') {
            console.error('不支持的文件类型:', ext);
            return res.status(400).json({
                success: false,
                error: `Unsupported file format: ${ext}. Only HTML and TXT files are supported.`
            });
        }

        const fileId = Date.now().toString();
        const filePath = path.join(uploadsDir, `${fileId}_${file.name}`);

        // 确保上传目录存在
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log(`创建上传目录: ${uploadsDir}`);
        }

        // 确保结果目录存在
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
            console.log(`创建结果目录: ${resultsDir}`);
        }

        // 保存上传的文件
        file.mv(filePath, async (err) => {
            if (err) {
                console.error('保存文件失败:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to save file: ' + err.message
                });
            }

            console.log(`文件已保存至: ${filePath}`);

            // 生成分析ID
            const analysisId = `analysis_${fileId}`;
            const outputPath = path.join(resultsDir, `${analysisId}.json`);

            try {
                // 分析聊天文件
                console.log(`开始分析文件: ${filePath}`);
                const analysisResult = await chatAnalyzer.analyzeChat(filePath, outputPath);

                if (analysisResult && analysisResult.success) {
                    console.log(`文件分析成功: ${analysisId}`);
                    res.json({
                        success: true,
                        file_id: fileId,
                        analysis_id: analysisId,
                        message: 'File uploaded and analyzed successfully'
                    });
                } else {
                    const errorMsg = analysisResult ? analysisResult.error : 'Unknown analysis error';
                    console.error(`文件分析失败: ${errorMsg}`);
                    res.status(500).json({
                        success: false,
                        error: errorMsg || 'Failed to analyze file'
                    });
                }
            } catch (error) {
                console.error('分析过程中出错:', error);
                console.error('错误堆栈:', error.stack);
                res.status(500).json({
                    success: false,
                    error: 'Error during file analysis: ' + (error.message || 'Unknown error')
                });
            }
        });
    } catch (error) {
        console.error('处理上传请求时出错:', error);
        console.error('错误堆栈:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Error processing upload request: ' + (error.message || 'Unknown error')
        });
    }
});

app.get('/api/analysis/:analysisId', (req, res) => {
    const analysisId = req.params.analysisId;
    const resultsPath = path.join(__dirname, 'results', `${analysisId}.json`);

    // 检查文件是否存在
    if (fs.existsSync(resultsPath)) {
        try {
            const data = fs.readFileSync(resultsPath, 'utf8');
            const analysisData = JSON.parse(data);
            res.json({
                success: true,
                data: analysisData
            });
        } catch (error) {
            console.error('Error reading analysis file:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to read analysis data'
            });
        }
    } else {
        // 如果文件不存在，返回示例数据（仅用于演示）
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
                statistics: {
                    totalMessages: 1234,
                    messageCountByParticipant: {
                        'User 1': 789,
                        'User 2': 445
                    },
                    messageCountByDate: {
                        '2023-05-01': 123,
                        '2023-05-02': 234,
                        '2023-05-03': 345,
                        '2023-05-04': 278,
                        '2023-05-05': 254
                    },
                    messageLengthStats: {
                        average: 78,
                        max: 512,
                        min: 1,
                        total: 96252
                    },
                    timeStats: {
                        mostActiveHour: 14,
                        messageCountByHour: {
                            '9': 120,
                            '10': 145,
                            '11': 167,
                            '12': 89,
                            '13': 134,
                            '14': 189,
                            '15': 156,
                            '16': 123,
                            '17': 111
                        }
                    }
                },
                emotions: {
                    'positive': 60,
                    'neutral': 30,
                    'negative': 10
                },
                top_keywords: {
                    'hello': 45,
                    'meeting': 32,
                    'project': 28,
                    'deadline': 24,
                    'weekend': 18,
                    'report': 15,
                    'design': 14,
                    'client': 12,
                    'feedback': 10,
                    'schedule': 9
                },
                sentiment: {
                    overall: 0.35,
                    byParticipant: {
                        'User 1': 0.42,
                        'User 2': 0.28
                    },
                    byDate: {
                        '2023-05-01': 0.45,
                        '2023-05-02': 0.38,
                        '2023-05-03': 0.25,
                        '2023-05-04': 0.31,
                        '2023-05-05': 0.36
                    }
                },
                summary: '这是一段关于聊天内容的中文摘要。对话主要围绕工作项目和即将到来的截止日期展开。参与者讨论了周末会议的安排，并分享了一些项目进展情况。整体氛围积极，偶尔有一些关于工作压力的讨论。',
                events: [
                    {
                        time: '2023-05-01 10:30:45',
                        sender: 'User 1',
                        content: '别忘了明天的会议，下午2点开始。'
                    },
                    {
                        time: '2023-05-02 14:15:22',
                        sender: 'User 2',
                        content: '我已经完成了项目的初步设计，可以在会议上讨论。'
                    },
                    {
                        time: '2023-05-03 09:45:11',
                        sender: 'User 1',
                        content: '周五之前我们需要提交最终方案。'
                    }
                ]
            }
        });
    }
});

// 获取可视化数据API
app.get('/api/visualization/:analysisId', (req, res) => {
    const analysisId = req.params.analysisId;
    const resultsPath = path.join(__dirname, 'results', `${analysisId}.json`);

    // 检查文件是否存在
    if (fs.existsSync(resultsPath)) {
        try {
            const data = fs.readFileSync(resultsPath, 'utf8');
            const analysisData = JSON.parse(data);

            // 使用可视化服务生成可视化数据
            const visualizationData = visualizationService.generateAllVisualizationData(analysisData);

            res.json({
                success: true,
                data: visualizationData
            });
        } catch (error) {
            console.error('Error generating visualization data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate visualization data'
            });
        }
    } else {
        // 如果文件不存在，返回示例可视化数据
        res.json({
            success: true,
            data: {
                activityTimeline: [
                    { date: '2023-05-01', count: 123 },
                    { date: '2023-05-02', count: 234 },
                    { date: '2023-05-03', count: 345 },
                    { date: '2023-05-04', count: 278 },
                    { date: '2023-05-05', count: 254 }
                ],
                hourlyHeatmap: Array.from({ length: 24 }, (_, i) => ({
                    hour: i,
                    count: Math.floor(Math.random() * 50)
                })),
                participantDistribution: {
                    labels: ['User 1', 'User 2'],
                    data: [789, 445]
                },
                keywordCloud: [
                    { name: 'hello', value: 45 },
                    { name: 'meeting', value: 32 },
                    { name: 'project', value: 28 },
                    { name: 'deadline', value: 24 },
                    { name: 'weekend', value: 18 },
                    { name: 'report', value: 15 },
                    { name: 'design', value: 14 },
                    { name: 'client', value: 12 },
                    { name: 'feedback', value: 10 },
                    { name: 'schedule', value: 9 }
                ],
                sentimentTrend: [
                    { date: '2023-05-01', score: 0.45 },
                    { date: '2023-05-02', score: 0.38 },
                    { date: '2023-05-03', score: 0.25 },
                    { date: '2023-05-04', score: 0.31 },
                    { date: '2023-05-05', score: 0.36 }
                ],
                interactionNetwork: {
                    nodes: [
                        { name: 'User 1', value: 789 },
                        { name: 'User 2', value: 445 }
                    ],
                    links: [
                        { source: 0, target: 1, value: 44.5 }
                    ]
                },
                messageLengthDistribution: {
                    labels: ['0-10', '11-50', '51-100', '101-200', '201-500', '500+'],
                    data: [30, 25, 20, 15, 7, 3]
                }
            }
        });
    }
});

// 导出分析结果为HTML
app.get('/api/export-html/:analysisId', async (req, res) => {
    const analysisId = req.params.analysisId;
    const resultsPath = path.join(__dirname, 'results', `${analysisId}.json`);

    // 检查分析结果文件是否存在
    if (!fs.existsSync(resultsPath)) {
        return res.status(404).json({
            success: false,
            error: 'Analysis result not found'
        });
    }

    try {
        // 读取分析结果
        const data = fs.readFileSync(resultsPath, 'utf8');
        const analysisData = JSON.parse(data);

        // 生成HTML导出文件名
        const htmlFileName = `${analysisId}_export.html`;
        const htmlFilePath = path.join(resultsDir, htmlFileName);

        // 生成HTML导出文件
        const exportResult = await htmlExportService.generateHtmlExport(analysisData, htmlFilePath);

        if (exportResult.success) {
            // 发送文件
            return res.download(htmlFilePath, `chat_analysis_${Date.now()}.html`, (err) => {
                if (err) {
                    console.error('Error sending HTML file:', err);
                    // 不需要再次发送响应，因为下载已经开始
                }

                // 下载完成后删除临时文件（可选）
                // fs.unlinkSync(htmlFilePath);
            });
        } else {
            return res.status(500).json({
                success: false,
                error: exportResult.error || 'Failed to generate HTML export'
            });
        }
    } catch (error) {
        console.error('Error exporting to HTML:', error);
        return res.status(500).json({
            success: false,
            error: 'Error generating HTML export: ' + error.message
        });
    }
});

// 前端路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});





app.get('/analysis', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'analysis.html'));
});

// 删除upload路由，因为已经移除了upload.html

app.get('/privacy-policy', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'privacy-policy.html'));
});

app.get('/terms-of-service', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'terms-of-service.html'));
});

// 处理缺失的图片
app.get('/static/img/:imageName', (req, res) => {
    const imagePath = path.join(__dirname, 'static', 'img', req.params.imageName);
    if (!fs.existsSync(imagePath)) {
        // 如果请求的图片不存在，返回一个默认的占位图
        res.sendFile(path.join(__dirname, 'static', 'img', 'placeholder.svg'));
    } else {
        res.sendFile(imagePath);
    }
});

// 404错误处理
app.use((req, res) => {
    console.log('404 Not Found:', req.url);
    res.status(404).send('页面未找到');
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).send('服务器错误');
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('静态文件目录:', path.join(__dirname, 'static'));
    console.log('模板文件目录:', path.join(__dirname, 'templates'));
});

module.exports = app;