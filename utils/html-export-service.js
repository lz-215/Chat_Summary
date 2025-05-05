/**
 * HTML导出服务 - 提供将聊天分析结果导出为HTML格式的功能
 */

const fs = require('fs');
const path = require('path');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const visualizationService = require('./visualization-service');

/**
 * 生成HTML导出文件
 * @param {Object} analysisResult - 分析结果对象
 * @param {String} outputPath - 输出文件路径
 * @returns {Promise<Object>} 导出结果
 */
async function generateHtmlExport(analysisResult, outputPath) {
    try {
        // 获取可视化数据
        const visualizationData = visualizationService.generateAllVisualizationData(analysisResult);

        // 生成图表图像
        const chartImages = await generateChartImages(visualizationData);

        // 生成HTML内容
        const htmlContent = generateHtmlContent(analysisResult, visualizationData, chartImages);

        // 写入文件
        fs.writeFileSync(outputPath, htmlContent, 'utf8');

        return {
            success: true,
            filePath: outputPath
        };
    } catch (error) {
        console.error('HTML导出错误:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 生成图表图像
 * @param {Object} visualizationData - 可视化数据
 * @returns {Promise<Object>} 图表图像的Base64字符串
 */
async function generateChartImages(visualizationData) {
    // 创建ChartJS渲染器
    const width = 800;
    const height = 400;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });

    // 生成活动时间线图表
    const activityChartConfig = {
        type: 'line',
        data: {
            labels: visualizationData.activityTimeline.map(item => item.date),
            datasets: [{
                label: 'Message Count',
                data: visualizationData.activityTimeline.map(item => item.count),
                borderColor: '#07c160',
                backgroundColor: 'rgba(7, 193, 96, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Message Activity'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    };

    // 生成参与者分布饼图
    const participantChartConfig = {
        type: 'pie',
        data: {
            labels: visualizationData.participantDistribution.map(item => item.name),
            datasets: [{
                data: visualizationData.participantDistribution.map(item => item.value),
                backgroundColor: [
                    '#07c160', '#1aad19', '#4cd964', '#5ac8fa', '#007aff',
                    '#34aadc', '#5856d6', '#ff2d55', '#ff3b30', '#ff9500'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                },
                title: {
                    display: true,
                    text: 'Participant Distribution'
                }
            }
        }
    };

    // 生成消息长度分布图
    const lengthChartConfig = {
        type: 'bar',
        data: {
            labels: visualizationData.messageLengthDistribution.labels,
            datasets: [{
                label: 'Percentage',
                data: visualizationData.messageLengthDistribution.data,
                backgroundColor: 'rgba(7, 193, 96, 0.6)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Message Length Distribution'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    };

    // 渲染图表为图像
    const activityChartImage = await chartJSNodeCanvas.renderToDataURL(activityChartConfig);
    const participantChartImage = await chartJSNodeCanvas.renderToDataURL(participantChartConfig);
    const lengthChartImage = await chartJSNodeCanvas.renderToDataURL(lengthChartConfig);

    return {
        activityChart: activityChartImage,
        participantChart: participantChartImage,
        lengthChart: lengthChartImage
    };
}

/**
 * 生成HTML内容
 * @param {Object} analysisResult - 分析结果对象
 * @param {Object} visualizationData - 可视化数据
 * @param {Object} chartImages - 图表图像
 * @returns {String} HTML内容
 */
function generateHtmlContent(analysisResult, visualizationData, chartImages) {
    // 格式化摘要内容，将换行符转换为<br>标签
    const formattedSummary = analysisResult.summary ?
        analysisResult.summary.replace(/\n/g, '<br>') :
        'No summary available.';

    // 格式化关键词
    const keywordsHtml = Object.entries(analysisResult.top_keywords || {})
        .map(([word, count]) => `<span class="keyword-tag">${word} (${count})</span>`)
        .join('');

    // 格式化事件
    const eventsHtml = (analysisResult.events || [])
        .map(event => `
            <div class="event-item">
                <div class="event-time">${event.time || ''}</div>
                <div class="event-sender">${event.sender || 'Unknown'}</div>
                <div class="event-content">${event.content || ''}</div>
            </div>
        `)
        .join('');

    // 生成HTML
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Analysis Visualization</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
            color: white;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin-bottom: 15px;
            font-size: 2.5em;
            font-weight: 700;
        }
        .header .metadata {
            font-size: 16px;
            opacity: 0.9;
        }
        .section {
            margin-bottom: 50px;
            border-radius: 10px;
            padding: 25px;
            background-color: white;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
            transition: transform 0.3s ease;
        }
        .section:hover {
            transform: translateY(-5px);
        }
        .section h2 {
            color: #2575fc;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 15px;
            margin-top: 0;
            font-size: 1.8em;
            display: flex;
            align-items: center;
        }
        .section h2 i {
            margin-right: 10px;
        }
        .summary-content {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            font-size: 1.1em;
            line-height: 1.8;
            margin-top: 20px;
        }
        .chart-container {
            margin: 25px 0;
            text-align: center;
            background-color: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.03);
        }
        .chart-container img {
            max-width: 100%;
            height: auto;
            border-radius: 5px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 25px 0;
        }
        .stat-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 3px 10px rgba(0,0,0,0.05);
            transition: all 0.3s ease;
        }
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #2575fc;
            margin-bottom: 10px;
        }
        .stat-label {
            font-size: 1em;
            color: #555;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .keywords-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
        }
        .keyword-tag {
            background-color: #e9f0ff;
            color: #2575fc;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            display: inline-block;
            transition: all 0.3s ease;
        }
        .keyword-tag:hover {
            background-color: #2575fc;
            color: white;
            transform: scale(1.05);
        }
        .events-container {
            margin-top: 20px;
        }
        .event-item {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid #2575fc;
            transition: all 0.3s ease;
        }
        .event-item:hover {
            background-color: #f0f5ff;
            transform: translateX(5px);
        }
        .event-time {
            color: #888;
            font-size: 0.9em;
            margin-bottom: 5px;
        }
        .event-sender {
            font-weight: bold;
            color: #2575fc;
            margin-bottom: 5px;
        }
        .event-content {
            font-size: 1.1em;
        }
        .footer {
            text-align: center;
            margin-top: 50px;
            padding: 20px;
            color: #888;
            font-size: 0.9em;
        }
        .visual-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 25px;
        }
        .visual-card {
            background-color: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 3px 10px rgba(0,0,0,0.05);
            transition: all 0.3s ease;
        }
        .visual-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .visual-card-header {
            background-color: #2575fc;
            color: white;
            padding: 15px;
            font-weight: bold;
            font-size: 1.2em;
        }
        .visual-card-body {
            padding: 20px;
        }
            font-size: 16px;
            line-height: 1.8;
        }
        .chart-container {
            margin: 20px 0;
            text-align: center;
        }
        .chart-container img {
            max-width: 100%;
            height: auto;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .stat-card {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #07c160;
        }
        .stat-label {
            font-size: 14px;
            color: #666;
        }
        .keywords-container {
            margin-top: 20px;
        }
        .keyword-tag {
            display: inline-block;
            background-color: #e8f5e9;
            color: #07c160;
            padding: 5px 10px;
            margin: 5px;
            border-radius: 15px;
            font-size: 14px;
        }
        .events-container {
            margin-top: 20px;
        }
        .event-item {
            padding: 10px;
            border-bottom: 1px solid #eee;
        }
        .event-item:last-child {
            border-bottom: none;
        }
        .event-time {
            font-size: 12px;
            color: #666;
        }
        .event-sender {
            font-weight: bold;
            margin: 5px 0;
        }
        .event-content {
            font-size: 14px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Chat Analysis Visualization</h1>
        <div class="metadata">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Total Messages: ${analysisResult.total_messages || 0} | Participants: ${Object.keys(analysisResult.senders || {}).length}</p>
        </div>
    </div>

    <div class="section">
        <h2><i class="fas fa-chart-pie"></i> Visual Overview</h2>
        <div class="visual-summary">
            <div class="visual-card">
                <div class="visual-card-header">Message Activity</div>
                <div class="visual-card-body">
                    <img src="${chartImages.activityChart}" alt="Activity Chart" style="width:100%">
                </div>
            </div>
            <div class="visual-card">
                <div class="visual-card-header">Participant Distribution</div>
                <div class="visual-card-body">
                    <img src="${chartImages.participantChart}" alt="Participant Distribution" style="width:100%">
                </div>
            </div>
            <div class="visual-card">
                <div class="visual-card-header">Message Length</div>
                <div class="visual-card-body">
                    <img src="${chartImages.lengthChart}" alt="Message Length Distribution" style="width:100%">
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2><i class="fas fa-align-left"></i> Conversation Summary</h2>
        <div class="summary-content">
            ${formattedSummary}
        </div>
    </div>

    <div class="section">
        <h2><i class="fas fa-chart-line"></i> Activity Analysis</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${analysisResult.total_messages || 0}</div>
                <div class="stat-label">Total Messages</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Object.keys(analysisResult.senders || {}).length}</div>
                <div class="stat-label">Participants</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${analysisResult.statistics?.messageLengthStats?.average?.toFixed(0) || 0}</div>
                <div class="stat-label">Avg. Message Length</div>
            </div>
        </div>
        <div class="chart-container">
            <h3>Message Activity Timeline</h3>
            <img src="${chartImages.activityChart}" alt="Activity Chart">
        </div>
    </div>

    <div class="section">
        <h2><i class="fas fa-users"></i> Participant Analysis</h2>
        <div class="chart-container">
            <h3>Message Distribution by Participant</h3>
            <img src="${chartImages.participantChart}" alt="Participant Distribution">
        </div>
    </div>

    <div class="section">
        <h2><i class="fas fa-comment-alt"></i> Message Analysis</h2>
        <div class="chart-container">
            <h3>Message Length Distribution</h3>
            <img src="${chartImages.lengthChart}" alt="Message Length Distribution">
        </div>
    </div>

    <div class="section">
        <h2><i class="fas fa-tags"></i> Key Topics</h2>
        <div class="keywords-container">
            ${keywordsHtml || '<p>No keywords available.</p>'}
        </div>
    </div>

    <div class="section">
        <h2><i class="fas fa-calendar-check"></i> Important Events</h2>
        <div class="events-container">
            ${eventsHtml || '<p>No events detected.</p>'}
        </div>
    </div>

    <div class="footer">
        <p>Generated by Chat Analyzer | <a href="https://github.com/yourusername/chat-analyzer" target="_blank">GitHub</a></p>
    </div>
</body>
</html>`;
}

module.exports = {
    generateHtmlExport
};
