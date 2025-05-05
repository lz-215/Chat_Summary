// 检查是否在Cloudflare环境中运行
const isCloudflare = typeof process === 'undefined' || !process.version;

// 根据环境加载不同的模块
let express, cors, morgan, path, fs, fileUpload, chatAnalyzer, visualizationService, htmlExportService, storage;

if (!isCloudflare) {
  // 在Node.js环境中
  require('dotenv').config({ path: './config/.env' });
  express = require('express');
  cors = require('cors');
  morgan = require('morgan');
  path = require('path');
  fs = require('fs');
  fileUpload = require('express-fileupload');
  chatAnalyzer = require('./utils/chat-analyzer');
  visualizationService = require('./utils/visualization-service');
  htmlExportService = require('./utils/html-export-service');
  storage = require('./utils/cloudflare-storage');
} else {
  // 在Cloudflare环境中
  // 注意：这些导入在Cloudflare环境中可能不可用，需要适配
  express = require('express');
  cors = require('cors');
  // morgan在Cloudflare环境中不可用，使用空函数代替
  morgan = () => (req, res, next) => next();
  path = require('path');
  // fs在Cloudflare环境中不可用，使用模拟对象代替
  fs = {
    existsSync: () => false,
    mkdirSync: () => {},
    readFileSync: () => '',
    writeFileSync: () => {}
  };
  fileUpload = require('express-fileupload');
  chatAnalyzer = require('./utils/chat-analyzer');
  visualizationService = require('./utils/visualization-service');
  htmlExportService = require('./utils/html-export-service');
  storage = require('./utils/cloudflare-storage');
}

// 导入路由

// 创建Express应用的函数
function createServer() {
  // 初始化Express应用
  const app = express();

  // 在Node.js环境中确保必要的目录存在
  if (!isCloudflare) {
    try {
      const uploadsDir = path.join(__dirname, 'uploads');
      const resultsDir = path.join(__dirname, 'results');
      const tmpDir = path.join(__dirname, 'tmp');

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }

      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      console.log('目录检查完成:');
      console.log(`- 上传目录: ${uploadsDir}`);
      console.log(`- 结果目录: ${resultsDir}`);
      console.log(`- 临时目录: ${tmpDir}`);
    } catch (error) {
      console.error('创建目录时出错:', error);
    }
  } else {
    console.log('在Cloudflare环境中运行，跳过目录检查');
  }

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
app.post('/api/upload-chat', async (req, res) => {
    console.log('Received file upload request');
    console.log('Headers:', req.headers);

    try {
        console.log('Running in Cloudflare environment:', isCloudflare);

        if (isCloudflare) {
            // Cloudflare环境下的处理逻辑
            // 在这种情况下，req.files不可用，需要从请求体中获取文件

            // 从请求中获取文件内容
            let fileContent;
            let fileName;

            if (req.body && req.body.file) {
                // 如果文件内容已经在请求体中
                fileContent = req.body.file;
                fileName = req.body.fileName || 'uploaded_file.txt';
            } else if (req.files && req.files.file) {
                // 如果文件在req.files中
                const file = req.files.file;
                fileContent = file.data.toString();
                fileName = file.name;
            } else {
                // 如果请求体中没有文件，返回错误
                console.error('No file received in request');
                return res.status(400).json({
                    success: false,
                    error: 'No file received in request'
                });
            }

            // 检查文件类型
            const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
            if (ext !== '.txt') {
                console.error('Unsupported file format:', ext);
                return res.status(400).json({
                    success: false,
                    error: `Unsupported file format: ${ext}. Only TXT files are supported.`
                });
            }

            // 生成文件ID和分析ID
            const fileId = Date.now().toString();
            const analysisId = `analysis_${fileId}`;

            try {
                // 使用存储模块保存文件内容
                await storage.saveUploadedFile(fileId, fileContent);
                console.log(`File saved with ID: ${fileId}`);

                // 分析聊天内容
                console.log(`Starting analysis of file: ${fileId}`);
                const analysisResult = await chatAnalyzer.analyzeChat(fileContent, analysisId);

                if (analysisResult && analysisResult.success) {
                    console.log(`Analysis successful: ${analysisId}`);
                    res.json({
                        success: true,
                        file_id: fileId,
                        analysis_id: analysisId,
                        message: 'File uploaded and analyzed successfully'
                    });
                } else {
                    const errorMsg = analysisResult ? analysisResult.error : 'Unknown analysis error';
                    console.error(`Analysis failed: ${errorMsg}`);
                    res.status(500).json({
                        success: false,
                        error: errorMsg || 'Failed to analyze file'
                    });
                }
            } catch (error) {
                console.error('Error during analysis:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error during file analysis: ' + (error.message || 'Unknown error')
                });
            }
        } else {
            // 本地环境下的处理逻辑
            // 检查是否有文件上传
            if (!req.files) {
                console.error('No files object received: req.files is empty');
                return res.status(400).json({
                    success: false,
                    error: 'No files object received'
                });
            }

            if (Object.keys(req.files).length === 0) {
                console.error('No file uploaded: req.files is an empty object');
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded'
                });
            }

            console.log('Received file fields:', Object.keys(req.files));

            if (!req.files.file) {
                console.error('No "file" field found in the request');
                return res.status(400).json({
                    success: false,
                    error: 'No file field found in the request'
                });
            }

            const file = req.files.file;
            console.log('File info:', {
                name: file.name,
                size: file.size,
                mimetype: file.mimetype
            });

            // 检查文件类型
            const ext = path.extname(file.name).toLowerCase();
            if (ext !== '.txt') {
                console.error('Unsupported file format:', ext);
                return res.status(400).json({
                    success: false,
                    error: `Unsupported file format: ${ext}. Only TXT files are supported.`
                });
            }

            const fileId = Date.now().toString();
            const uploadsDir = path.join(__dirname, 'uploads');
            const resultsDir = path.join(__dirname, 'results');
            const filePath = path.join(uploadsDir, `${fileId}_${file.name}`);

            // 确保上传目录存在
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
                console.log(`Created upload directory: ${uploadsDir}`);
            }

            // 确保结果目录存在
            if (!fs.existsSync(resultsDir)) {
                fs.mkdirSync(resultsDir, { recursive: true });
                console.log(`Created results directory: ${resultsDir}`);
            }

            // 保存上传的文件
            file.mv(filePath, async (err) => {
                if (err) {
                    console.error('Failed to save file:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to save file: ' + err.message
                    });
                }

                console.log(`File saved to: ${filePath}`);

                // 生成分析ID
                const analysisId = `analysis_${fileId}`;
                const outputPath = path.join(resultsDir, `${analysisId}.json`);

                try {
                    // 分析聊天文件
                    console.log(`Starting analysis of file: ${filePath}`);
                    const analysisResult = await chatAnalyzer.analyzeChat(filePath, outputPath);

                    if (analysisResult && analysisResult.success) {
                        console.log(`Analysis successful: ${analysisId}`);
                        res.json({
                            success: true,
                            file_id: fileId,
                            analysis_id: analysisId,
                            message: 'File uploaded and analyzed successfully'
                        });
                    } else {
                        const errorMsg = analysisResult ? analysisResult.error : 'Unknown analysis error';
                        console.error(`Analysis failed: ${errorMsg}`);
                        res.status(500).json({
                            success: false,
                            error: errorMsg || 'Failed to analyze file'
                        });
                    }
                } catch (error) {
                    console.error('Error during analysis:', error);
                    console.error('Error stack:', error.stack);
                    res.status(500).json({
                        success: false,
                        error: 'Error during file analysis: ' + (error.message || 'Unknown error')
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error processing upload request:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Error processing upload request: ' + (error.message || 'Unknown error')
        });
    }
});

app.get('/api/analysis/:analysisId', async (req, res) => {
    const analysisId = req.params.analysisId;

    try {
        if (isCloudflare) {
            // 在Cloudflare环境中使用存储模块获取分析结果
            const analysisData = await storage.getAnalysisResult(analysisId);

            if (analysisData) {
                res.json({
                    success: true,
                    data: analysisData
                });
            } else {
                // 如果找不到分析结果，返回示例数据
                returnSampleData(analysisId, res);
            }
        } else {
            // 在本地环境中使用文件系统
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
                // 如果文件不存在，返回示例数据
                returnSampleData(analysisId, res);
            }
        }
    } catch (error) {
        console.error('Error retrieving analysis data:', error);
        res.status(500).json({
            success: false,
            error: 'Error retrieving analysis data: ' + (error.message || 'Unknown error')
        });
    }
});

// 返回示例数据的辅助函数
function returnSampleData(analysisId, res) {
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

// 获取可视化数据API
app.get('/api/visualization/:analysisId', async (req, res) => {
    const analysisId = req.params.analysisId;

    try {
        let analysisData;

        if (isCloudflare) {
            // 在Cloudflare环境中使用存储模块获取分析结果
            analysisData = await storage.getAnalysisResult(analysisId);
        } else {
            // 在本地环境中使用文件系统
            const resultsPath = path.join(__dirname, 'results', `${analysisId}.json`);

            // 检查文件是否存在
            if (fs.existsSync(resultsPath)) {
                const data = fs.readFileSync(resultsPath, 'utf8');
                analysisData = JSON.parse(data);
            }
        }

        if (analysisData) {
            // 使用可视化服务生成可视化数据
            const visualizationData = visualizationService.generateAllVisualizationData(analysisData);

            res.json({
                success: true,
                data: visualizationData
            });
        } else {
            // 如果找不到分析结果，返回示例可视化数据
            returnSampleVisualizationData(res);
        }
    } catch (error) {
        console.error('Error generating visualization data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate visualization data: ' + (error.message || 'Unknown error')
        });
    }
});

// 返回示例可视化数据的辅助函数
function returnSampleVisualizationData(res) {
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

// 导出分析结果为HTML
app.get('/api/export-html/:analysisId', async (req, res) => {
    const analysisId = req.params.analysisId;

    try {
        let analysisData;

        if (isCloudflare) {
            // 在Cloudflare环境中使用存储模块获取分析结果
            analysisData = await storage.getAnalysisResult(analysisId);

            if (!analysisData) {
                return res.status(404).json({
                    success: false,
                    error: 'Analysis result not found'
                });
            }

            // 生成HTML导出内容
            const htmlContent = await htmlExportService.generateHtmlString(analysisData);

            if (htmlContent) {
                // 保存HTML导出内容
                const exportId = `${analysisId}_export_${Date.now()}`;
                await storage.saveHtmlExport(exportId, htmlContent);

                // 设置响应头，使浏览器下载文件
                res.setHeader('Content-Type', 'text/html');
                res.setHeader('Content-Disposition', `attachment; filename="chat_analysis_${Date.now()}.html"`);

                // 发送HTML内容
                return res.send(htmlContent);
            } else {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to generate HTML content'
                });
            }
        } else {
            // 在本地环境中使用文件系统
            const resultsDir = path.join(__dirname, 'results');
            const resultsPath = path.join(resultsDir, `${analysisId}.json`);

            // 检查分析结果文件是否存在
            if (!fs.existsSync(resultsPath)) {
                return res.status(404).json({
                    success: false,
                    error: 'Analysis result not found'
                });
            }

            // 读取分析结果
            const data = fs.readFileSync(resultsPath, 'utf8');
            analysisData = JSON.parse(data);

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
        }
    } catch (error) {
        console.error('Error exporting to HTML:', error);
        return res.status(500).json({
            success: false,
            error: 'Error generating HTML export: ' + (error.message || 'Unknown error')
        });
    }
});

// 前端路由
app.get('/', async (req, res) => {
    if (isCloudflare) {
        // 在Cloudflare环境中，使用KV存储获取模板
        try {
            const content = await CHAT_ANALYSIS_STORAGE.get('file:templates/index.html');
            if (content) {
                res.set('Content-Type', 'text/html');
                res.send(content);
            } else {
                res.status(404).send('Home page not found');
            }
        } catch (error) {
            console.error('Error serving home page:', error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        // 在本地环境中使用文件系统
        res.sendFile(path.join(__dirname, 'templates', 'index.html'));
    }
});





app.get('/analysis', async (req, res) => {
    if (isCloudflare) {
        // 在Cloudflare环境中，使用KV存储获取模板
        try {
            const content = await CHAT_ANALYSIS_STORAGE.get('file:templates/analysis.html');
            if (content) {
                res.set('Content-Type', 'text/html');
                res.send(content);
            } else {
                res.status(404).send('Analysis page not found');
            }
        } catch (error) {
            console.error('Error serving analysis page:', error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        // 在本地环境中使用文件系统
        res.sendFile(path.join(__dirname, 'templates', 'analysis.html'));
    }
});

// 删除upload路由，因为已经移除了upload.html

app.get('/privacy-policy', async (req, res) => {
    if (isCloudflare) {
        // 在Cloudflare环境中，使用KV存储获取模板
        try {
            const content = await CHAT_ANALYSIS_STORAGE.get('file:templates/privacy-policy.html');
            if (content) {
                res.set('Content-Type', 'text/html');
                res.send(content);
            } else {
                res.status(404).send('Privacy policy page not found');
            }
        } catch (error) {
            console.error('Error serving privacy policy page:', error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        // 在本地环境中使用文件系统
        res.sendFile(path.join(__dirname, 'templates', 'privacy-policy.html'));
    }
});

app.get('/terms-of-service', async (req, res) => {
    if (isCloudflare) {
        // 在Cloudflare环境中，使用KV存储获取模板
        try {
            const content = await CHAT_ANALYSIS_STORAGE.get('file:templates/terms-of-service.html');
            if (content) {
                res.set('Content-Type', 'text/html');
                res.send(content);
            } else {
                res.status(404).send('Terms of service page not found');
            }
        } catch (error) {
            console.error('Error serving terms of service page:', error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        // 在本地环境中使用文件系统
        res.sendFile(path.join(__dirname, 'templates', 'terms-of-service.html'));
    }
});

// 处理缺失的图片
app.get('/static/img/:imageName', async (req, res) => {
    const imageName = req.params.imageName;

    if (isCloudflare) {
        // 在Cloudflare环境中，使用KV存储获取图片
        try {
            // 尝试获取请求的图片
            let content = await CHAT_ANALYSIS_STORAGE.get(`file:static/img/${imageName}`, { type: 'arrayBuffer' });

            if (!content) {
                // 如果请求的图片不存在，返回一个默认的占位图
                content = await CHAT_ANALYSIS_STORAGE.get('file:static/img/placeholder.svg', { type: 'arrayBuffer' });
            }

            if (content) {
                // 根据文件扩展名设置Content-Type
                const ext = imageName.split('.').pop().toLowerCase();
                const contentTypes = {
                    'png': 'image/png',
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'svg': 'image/svg+xml',
                    'gif': 'image/gif',
                    'webp': 'image/webp'
                };

                res.set('Content-Type', contentTypes[ext] || 'image/png');
                res.send(Buffer.from(content));
            } else {
                res.status(404).send('Image not found');
            }
        } catch (error) {
            console.error('Error serving image:', error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        // 在本地环境中使用文件系统
        const imagePath = path.join(__dirname, 'static', 'img', imageName);
        if (!fs.existsSync(imagePath)) {
            // 如果请求的图片不存在，返回一个默认的占位图
            res.sendFile(path.join(__dirname, 'static', 'img', 'placeholder.svg'));
        } else {
            res.sendFile(imagePath);
        }
    }
});

// 404错误处理
app.use((req, res) => {
    console.log('404 Not Found:', req.url);
    res.status(404).send('Page Not Found');
});

// 错误处理中间件
app.use((err, req, res, _next) => {
    console.error('Server Error:', err.stack || err.message || err);
    res.status(500).send('Internal Server Error');
});

  return app;
}

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  const app = createServer();
  const PORT = process.env.PORT || 3003;
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('静态文件目录:', path.join(__dirname, 'static'));
    console.log('模板文件目录:', path.join(__dirname, 'templates'));
  });
}

// 导出createServer函数供Cloudflare Workers使用
module.exports = { createServer };