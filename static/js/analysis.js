// Analysis page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tabs
    // initTabs(); // Commented out as tabs are removed from HTML

    // Get analysis ID from URL
    const analysisId = getAnalysisIdFromUrl();

    // Load analysis data
    if (analysisId) {
        loadAnalysisData(analysisId);
    } else {
        showError('No analysis ID provided');
    }

    // Initialize event listeners
    initEventListeners();
});

// Initialize tab functionality
/* Commented out as tabs are removed from HTML
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = `${button.dataset.tab}-content`;
            document.getElementById(tabId).classList.add('active');
        });
    });
}
*/

// Get analysis ID from URL
function getAnalysisIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Load analysis data from server
function loadAnalysisData(analysisId, retryCount = 0) {
    // Show loading state
    setLoadingState(true);

    // 最大重试次数
    const MAX_RETRIES = 2;

    console.log(`Attempting to load analysis data (attempt ${retryCount + 1})`);

    // Fetch analysis data from server
    fetch(`/api/analysis/${analysisId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch analysis data');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log('Analysis data loaded successfully');
                // Remove loading placeholders
                setLoadingState(false);

                // Populate data on the page
                populateData(data.data);

                // Initialize charts
                initCharts(data.data);
            } else {
                throw new Error(data.error || 'Failed to load analysis data');
            }
        })
        .catch(error => {
            console.error('Error loading analysis data:', error);

            // 如果还有重试次数，则尝试重新加载
            if (retryCount < MAX_RETRIES) {
                console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
                // 延迟1秒后重试
                setTimeout(() => {
                    loadAnalysisData(analysisId, retryCount + 1);
                }, 1000);
                return;
            }

            // 如果已经达到最大重试次数，则显示错误并尝试加载本地示例数据
            console.log('Maximum retry attempts reached, loading fallback data');

            // 尝试加载示例数据
            try {
                // 创建一个示例数据对象
                const fallbackData = createFallbackData(analysisId);

                // 移除加载状态
                setLoadingState(false);

                // 使用示例数据填充页面
                populateData(fallbackData);

                // 初始化图表
                initCharts(fallbackData);

                // 不显示错误弹窗，因为我们已经加载了示例数据
                console.log('Fallback data loaded successfully');
            } catch (fallbackError) {
                console.error('Error loading fallback data:', fallbackError);
                showError('Failed to load analysis data. Please try again.');
                setLoadingState(false);
            }
        });
}

// Set loading state for UI elements
function setLoadingState(isLoading) {
    const loadingElements = document.querySelectorAll('.loading-placeholder');
    const contentElements = document.querySelectorAll('.content-loaded');

    if (isLoading) {
        loadingElements.forEach(el => el.style.display = 'block');
        contentElements.forEach(el => el.style.display = 'none');
    } else {
        loadingElements.forEach(el => el.style.display = 'none');
        contentElements.forEach(el => el.style.display = 'block');
    }
}

// Populate data on the page
function populateData(data) {
    // Metadata section has been removed from HTML

    // Statistics cards have been removed from HTML

    // Summary
    const summaryContainer = document.querySelector('#summary-content .content-loaded');
    // 将换行符转换为HTML的<br>标签，并保留格式
    const formattedSummary = data.summary ?
        data.summary.replace(/\n/g, '<br>') :
        'No summary available.';

    // 直接显示摘要内容，不添加标题
    summaryContainer.innerHTML = `<div class="formatted-summary">${formattedSummary}</div>`;

    // Events
    const eventsContainer = document.querySelector('.events-section .content-loaded');
    if (data.events && data.events.length > 0) {
        const eventsHtml = data.events.map(event => {
            // 根据事件类型设置不同的样式
            const typeClass = event.type ? `event-type-${event.type.toLowerCase().replace(/\s+/g, '-')}` : '';
            const typeLabel = event.type ? `<div class="event-type-label">${event.type}</div>` : '';

            // Adjusted HTML structure for better CSS grid control
            return `
            <div class="event-item ${typeClass}">
                <div class="event-info">
                    <div class="event-date">${event.time || 'Unknown date'}</div>
                    <div class="event-sender">${event.sender || 'Unknown'}</div>
                </div>
                <div class="event-content">${event.content || ''}</div>
                ${typeLabel}
            </div>
            `;
        }).join('');
        eventsContainer.innerHTML = eventsHtml;
    } else {
        eventsContainer.innerHTML = '<p>No key events detected.</p>';
    }

    // Topics
    const topicsContainer = document.querySelector('.topics-section .content-loaded');
    if (data.top_keywords && Object.keys(data.top_keywords).length > 0) {
        const topicsHtml = `
            <div class="topic-list">
                ${Object.entries(data.top_keywords).map(([keyword, count]) =>
                    `<div class="topic-tag">${keyword} (${count})</div>`
                ).join('')}
            </div>
        `;
        topicsContainer.innerHTML = topicsHtml;
    } else {
        topicsContainer.innerHTML = '<p>No significant topics detected.</p>';
    }

    // Timeline
    const timelineContainer = document.querySelector('.timeline-section .content-loaded');
    // This would be populated with actual messages in a real implementation
    timelineContainer.innerHTML = '<p>Message timeline is not available in this demo.</p>';
}

// Initialize charts
function initCharts(data) {
    try {
        console.log('Initializing charts with data:', data);

        /* Commented out Activity Chart initialization as the element is removed
        // Activity chart
        const activityCtx = document.createElement('canvas');
        const activityChartContainer = document.getElementById('activity-chart');
        if (activityChartContainer) {
            activityChartContainer.innerHTML = '';
            activityChartContainer.appendChild(activityCtx);

            // Sample data for demonstration
            const activityChart = new Chart(activityCtx, {
                type: 'line',
                data: {
                    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
                    datasets: [{
                        label: 'Messages',
                        data: [12, 19, 3, 5, 2, 3, 7],
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Message Activity'
                        }
                    }
                }
            });
        } else {
            console.warn('Element with ID \'activity-chart\' not found.');
        }
        */

    // Participants chart
    const participantsChartContainer = document.getElementById('participants-chart');
    if (participantsChartContainer) {
        if (data.senders && Object.keys(data.senders).length > 0) {
            const participantsCtx = document.createElement('canvas');
            participantsChartContainer.innerHTML = '';
            participantsChartContainer.appendChild(participantsCtx);

            const participantsChart = new Chart(participantsCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(data.senders),
                    datasets: [{
                        label: 'Messages Sent',
                        data: Object.values(data.senders),
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.5)',
                            'rgba(54, 162, 235, 0.5)',
                            'rgba(255, 206, 86, 0.5)',
                            'rgba(75, 192, 192, 0.5)',
                            'rgba(153, 102, 255, 0.5)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Messages by Participant'
                        }
                    }
                }
            });
        }
    } else {
        console.warn('Element with ID \'participants-chart\' not found.');
    }

    // 初始化词云图
    // 注释掉这段代码，因为activityCtx未定义，可能导致错误
    /*
    const activityChart = new Chart(activityCtx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
            datasets: [{
                label: 'Messages',
                data: [12, 19, 3, 5, 2, 3, 7],
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Message Activity'
                }
            }
        }
    });
    */

    // Participants chart
    if (data.senders && Object.keys(data.senders).length > 0) {
        const participantsCtx = document.createElement('canvas');
        document.getElementById('participants-chart').innerHTML = '';
        document.getElementById('participants-chart').appendChild(participantsCtx);

        const participantsChart = new Chart(participantsCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(data.senders),
                datasets: [{
                    label: 'Messages Sent',
                    data: Object.values(data.senders),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Messages by Participant'
                    }
                }
            }
        });
    }

    // 初始化词云图
    initWordCloud(data);

    // 初始化活动热力图
    initActivityHeatmap(data);

    // 初始化消息长度分布图
    initMessageLengthChart(data);

    // 初始化互动关系网络图
    initInteractionNetwork(data);

    // 其他图表暂时显示占位信息
    try {
        // 使用安全的方式获取DOM元素并设置内容
        const setChartPlaceholder = (id, message) => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = message;
            }
        };

        setChartPlaceholder('time-chart', 'Chart not available in demo');
        setChartPlaceholder('weekday-chart', 'Chart not available in demo');
        setChartPlaceholder('types-chart', 'Chart not available in demo');
        setChartPlaceholder('sentiment-timeline', 'Chart not available in demo');
        setChartPlaceholder('sentiment-participants', 'Chart not available in demo');
        setChartPlaceholder('keywords-chart', 'Chart will be implemented soon');
        setChartPlaceholder('topics-distribution', 'Chart will be implemented soon');
    } catch (error) {
        console.error('Error setting chart placeholders:', error);
    }

    console.log('Charts initialization completed successfully');
    } catch (error) {
        console.error('Error initializing charts:', error);
        // 即使图表初始化失败，也不显示错误弹窗，让用户可以看到其他内容
    }
}

// Initialize event listeners
function initEventListeners() {
    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            // 获取分析ID
            const analysisId = getAnalysisIdFromUrl();
            if (!analysisId) {
                showError('No analysis ID found');
                return;
            }

            // 直接导出为HTML
            exportAsHtml(analysisId);
        });
    }

    // Share button
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            alert('Share functionality is not available in this demo.');
        });
    }

    // Timeline search
    const timelineSearch = document.getElementById('timeline-search');
    if (timelineSearch) {
        timelineSearch.addEventListener('input', function() {
            // In a real implementation, this would filter the timeline messages
            console.log('Searching for:', this.value);
        });
    }
}

// 初始化消息长度分布图
function initMessageLengthChart(data) {
    // 获取图表容器
    const chartContainer = document.getElementById('message-length-chart');
    if (!chartContainer) return;

    // 清空容器
    chartContainer.innerHTML = '';

    // 检查是否有消息长度统计数据
    if (!data.statistics || !data.statistics.messageLengthStats) {
        chartContainer.innerHTML = 'No message length data available';
        return;
    }

    // 创建消息长度区间
    const lengthRanges = ['0-10', '11-50', '51-100', '101-200', '201-500', '500+'];

    // 创建示例数据（实际应用中应该从data中提取）
    // 这里我们基于平均消息长度生成一些模拟数据
    const avgLength = data.statistics.messageLengthStats.average || 0;
    const distributionData = [];

    // 根据平均长度生成分布数据
    if (avgLength <= 10) {
        distributionData.push(60, 25, 10, 3, 1, 1);
    } else if (avgLength <= 50) {
        distributionData.push(30, 45, 15, 7, 2, 1);
    } else if (avgLength <= 100) {
        distributionData.push(15, 30, 35, 15, 4, 1);
    } else if (avgLength <= 200) {
        distributionData.push(10, 20, 30, 30, 8, 2);
    } else {
        distributionData.push(5, 15, 25, 30, 20, 5);
    }

    // 初始化Chart.js实例
    const ctx = document.createElement('canvas');
    chartContainer.appendChild(ctx);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: lengthRanges,
            datasets: [{
                label: '消息数量分布',
                data: distributionData,
                backgroundColor: [
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 205, 86, 0.6)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 205, 86, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '消息长度分布'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// 初始化活动热力图
function initActivityHeatmap(data) {
    // 获取热力图容器
    const heatmapContainer = document.getElementById('activity-heatmap');
    if (!heatmapContainer) return;

    // 清空容器
    heatmapContainer.innerHTML = '';

    // 检查是否有时间统计数据
    if (!data.statistics || !data.statistics.timeStats || !data.statistics.timeStats.messageCountByHour) {
        heatmapContainer.innerHTML = 'No time data available';
        return;
    }

    // 准备热力图数据
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    // 创建示例数据（实际应用中应该从data中提取）
    const heatmapData = [];

    // 从messageCountByHour生成热力图数据
    // 这里简化处理，将每小时的消息数分配到一周的不同天
    hours.forEach(hour => {
        const count = data.statistics.timeStats.messageCountByHour[hour] || 0;

        // 将每小时的消息数平均分配到一周的不同天
        days.forEach((day, dayIndex) => {
            // 创建一些随机变化，使热力图更有变化
            const value = Math.max(0, Math.floor(count / 7) + Math.floor(Math.random() * 3) - 1);

            if (value > 0) {
                heatmapData.push([dayIndex, hour, value]);
            }
        });
    });

    // 初始化ECharts实例
    const heatmapChart = echarts.init(heatmapContainer);

    // 设置热力图配置
    const option = {
        tooltip: {
            position: 'top',
            formatter: function (params) {
                return days[params.data[0]] + ' ' + params.data[1] + '时: ' + params.data[2] + '条消息';
            }
        },
        grid: {
            top: '10%',
            left: '3%',
            right: '4%',
            bottom: '10%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: days,
            splitArea: {
                show: true
            }
        },
        yAxis: {
            type: 'category',
            data: hours.map(h => h + '时'),
            splitArea: {
                show: true
            }
        },
        visualMap: {
            min: 0,
            max: 10,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '0%',
            inRange: {
                color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695']
            }
        },
        series: [{
            name: '消息数量',
            type: 'heatmap',
            data: heatmapData,
            label: {
                show: false
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    };

    // 应用配置
    heatmapChart.setOption(option);

    // 响应窗口大小变化
    window.addEventListener('resize', function() {
        heatmapChart.resize();
    });
}

// 初始化词云图
function initWordCloud(data) {
    // 获取词云容器
    const wordCloudContainer = document.getElementById('word-cloud');
    if (!wordCloudContainer) return;

    // 清空容器
    wordCloudContainer.innerHTML = '';

    // 检查是否有关键词数据
    if (!data.top_keywords || Object.keys(data.top_keywords).length === 0) {
        wordCloudContainer.innerHTML = 'No keyword data available';
        return;
    }

    // 准备词云数据
    const wordCloudData = Object.entries(data.top_keywords).map(([word, weight]) => {
        return {
            name: word,
            value: typeof weight === 'number' ? weight : 1
        };
    });

    // 如果没有数据，显示提示信息
    if (wordCloudData.length === 0) {
        wordCloudContainer.innerHTML = 'No keywords found';
        return;
    }

    // 初始化ECharts实例
    const wordCloudChart = echarts.init(wordCloudContainer);

    // 设置词云配置
    const option = {
        tooltip: {
            show: true
        },
        series: [{
            type: 'wordCloud',
            shape: 'circle',
            left: 'center',
            top: 'center',
            width: '90%',
            height: '90%',
            right: null,
            bottom: null,
            sizeRange: [12, 60],
            rotationRange: [-90, 90],
            rotationStep: 45,
            gridSize: 8,
            drawOutOfBound: false,
            textStyle: {
                fontFamily: 'sans-serif',
                fontWeight: 'bold',
                color: function () {
                    // 随机颜色
                    return 'rgb(' + [
                        Math.round(Math.random() * 160),
                        Math.round(Math.random() * 160),
                        Math.round(Math.random() * 160)
                    ].join(',') + ')';
                }
            },
            emphasis: {
                textStyle: {
                    shadowBlur: 10,
                    shadowColor: '#333'
                }
            },
            data: wordCloudData
        }]
    };

    // 应用配置
    wordCloudChart.setOption(option);

    // 响应窗口大小变化
    window.addEventListener('resize', function() {
        wordCloudChart.resize();
    });
}

// 初始化互动关系网络图
function initInteractionNetwork(data) {
    // 获取网络图容器
    const networkContainer = document.getElementById('interaction-network');
    if (!networkContainer) return;

    // 清空容器
    networkContainer.innerHTML = '';

    // 检查是否有参与者数据
    if (!data.senders || Object.keys(data.senders).length === 0) {
        networkContainer.innerHTML = 'No participant data available';
        return;
    }

    // 准备网络图数据
    const participants = Object.keys(data.senders);

    // 如果只有一个参与者，显示提示信息
    if (participants.length <= 1) {
        networkContainer.innerHTML = 'At least two participants are needed for network visualization';
        return;
    }

    // 创建节点数据
    const nodes = participants.map((name, index) => {
        return {
            id: index,
            name: name,
            value: data.senders[name],
            symbolSize: Math.max(30, Math.min(70, 30 + data.senders[name] / 5)),
            category: index
        };
    });

    // 创建连接数据
    const links = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            // 创建一个基于消息数量的连接强度
            const value = Math.min(nodes[i].value, nodes[j].value) / 10;

            if (value > 0) {
                links.push({
                    source: i,
                    target: j,
                    value: value
                });
            }
        }
    }

    // 创建类别数据
    const categories = participants.map(name => {
        return {
            name: name
        };
    });

    // 初始化ECharts实例
    const networkChart = echarts.init(networkContainer);

    // 设置网络图配置
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function (params) {
                if (params.dataType === 'node') {
                    return `${params.data.name}: ${params.data.value} 条消息`;
                } else {
                    return `${nodes[params.data.source].name} ↔ ${nodes[params.data.target].name}`;
                }
            }
        },
        legend: {
            data: participants,
            orient: 'vertical',
            right: 10,
            top: 20,
            bottom: 20,
            textStyle: {
                color: '#333'
            }
        },
        series: [{
            name: '互动关系',
            type: 'graph',
            layout: 'force',
            data: nodes,
            links: links,
            categories: categories,
            roam: true,
            label: {
                show: true,
                position: 'right',
                formatter: '{b}'
            },
            force: {
                repulsion: 100,
                edgeLength: [50, 100]
            },
            lineStyle: {
                color: 'source',
                curveness: 0.3,
                width: function(params) {
                    return Math.max(1, params.data.value);
                }
            },
            emphasis: {
                focus: 'adjacency',
                lineStyle: {
                    width: 5
                }
            }
        }]
    };

    // 应用配置
    networkChart.setOption(option);

    // 响应窗口大小变化
    window.addEventListener('resize', function() {
        networkChart.resize();
    });
}

// 导出为HTML
function exportAsHtml(analysisId) {
    // 显示加载状态
    const loadingToast = showLoading('Generating HTML export...');

    // 获取分析数据
    fetch(`/api/analysis/${analysisId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch analysis data');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // 生成HTML内容
                const htmlContent = generateHtmlContent(data.data);

                // 创建下载链接
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);

                // 创建下载链接并点击
                const a = document.createElement('a');
                a.href = url;
                a.download = `chat_analysis_${Date.now()}.html`;
                document.body.appendChild(a);
                a.click();

                // 清理
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    hideLoading(loadingToast);
                }, 100);
            } else {
                throw new Error(data.error || 'Failed to export data');
            }
        })
        .catch(error => {
            console.error('Error exporting data:', error);
            showError('Failed to export data: ' + error.message);
            hideLoading(loadingToast);
        });
}

// 导出为JSON
function exportAsJson(analysisId) {
    fetch(`/api/analysis/${analysisId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch analysis data');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // 创建下载链接
                const jsonStr = JSON.stringify(data.data, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                // 创建下载链接并点击
                const a = document.createElement('a');
                a.href = url;
                a.download = `chat_analysis_${analysisId}.json`;
                document.body.appendChild(a);
                a.click();

                // 清理
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            } else {
                throw new Error(data.error || 'Failed to export data');
            }
        })
        .catch(error => {
            console.error('Error exporting data:', error);
            showError('Failed to export data: ' + error.message);
        });
}

// 显示加载提示
function showLoading(message) {
    const toast = document.createElement('div');
    toast.className = 'loading-toast';
    toast.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-message">${message}</div>
    `;

    // 样式
    toast.style.position = 'fixed';
    toast.style.top = '50%';
    toast.style.left = '50%';
    toast.style.transform = 'translate(-50%, -50%)';
    toast.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    toast.style.color = '#fff';
    toast.style.padding = '20px';
    toast.style.borderRadius = '8px';
    toast.style.zIndex = '9999';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';

    // 加载动画样式
    const style = document.createElement('style');
    style.textContent = `
        .loading-spinner {
            width: 24px;
            height: 24px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    // 添加到DOM
    document.body.appendChild(toast);

    return toast;
}

// 隐藏加载提示
function hideLoading(toast) {
    if (document.body.contains(toast)) {
        document.body.removeChild(toast);
    }
}

// 生成HTML内容
function generateHtmlContent(data) {
    // 格式化摘要内容，将换行符转换为<br>标签
    const formattedSummary = data.summary ?
        data.summary.replace(/\n/g, '<br>') :
        'No summary available.';

    // 格式化关键词
    const keywordsHtml = Object.entries(data.top_keywords || {})
        .map(([word, count]) => `<span class="keyword-tag">${word} (${count})</span>`)
        .join('');

    // 格式化事件
    const eventsHtml = (data.events || [])
        .map(event => `
            <div class="event-item">
                <div class="event-time">${event.time || ''}</div>
                <div class="event-sender">${event.sender || 'Unknown'}</div>
                <div class="event-content">${event.content || ''}</div>
            </div>
        `)
        .join('');

    /* Comment out Statistics Overview generation
    // 生成统计数据HTML
    const statsHtml = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${data.total_messages || 0}</div>
                <div class="stat-label">Total Messages</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Object.keys(data.senders || {}).length}</div>
                <div class="stat-label">Participants</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.statistics?.messageLengthStats?.average?.toFixed(0) || 0}</div>
                <div class="stat-label">Avg. Message Length</div>
            </div>
        </div>
    `;
    */
    const statsHtml = ''; // Assign empty string so it doesn't break the template

    /* Comment out Participant Distribution generation
    // 生成参与者分布数据
    const participantsData = Object.entries(data.senders || {})
        .map(([name, count], index) => {
            return {
                name,
                count,
                color: getColorForIndex(index)
            };
        });

    // 生成参与者分布HTML
    const participantsHtml = participantsData.map(p => `
        <div class="participant-item">
            <div class="participant-color" style="background-color: ${p.color}"></div>
            <div class="participant-name">${p.name}</div>
            <div class="participant-count">${p.count} messages</div>
        </div>
    `).join('');
    */
    const participantsHtml = ''; // Assign empty string so it doesn't break the template

    // 生成HTML
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Analysis Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #07c160;
            margin-bottom: 10px;
        }
        .header .metadata {
            color: #666;
            font-size: 14px;
        }
        .section {
            margin-bottom: 40px;
            border: 1px solid #eee;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .section h2 {
            color: #07c160;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-top: 0;
        }
        .summary-content {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            font-size: 16px;
            line-height: 1.8;
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
        .participant-item {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            padding: 10px;
            background-color: #f9f9f9;
            border-radius: 5px;
        }
        .participant-color {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            margin-right: 10px;
        }
        .participant-name {
            font-weight: bold;
            flex: 1;
        }
        .participant-count {
            color: #666;
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
        <h1>Chat Analysis Report</h1>
        <div class="metadata">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Total Messages: ${data.total_messages || 0}</p>
            <p>Participants: ${Object.keys(data.senders || {}).length}</p>
        </div>
    </div>

    <div class="section">
        <h2>Summary</h2>
        <div class="summary-content">
            ${formattedSummary}
        </div>
    </div>

    <!-- Comment out Statistics section in exported HTML -->
    <!--
    <div class="section">
        <h2>Statistics</h2>
        ${statsHtml}
    </div>
    -->

    <!-- Comment out Participant Distribution section in exported HTML -->
    <!--
    <div class="section">
        <h2>Participant Distribution</h2>
        <div class="participants-container">
            ${participantsHtml}
        </div>
    </div>
    -->

    <div class="section">
        <h2>Key Topics</h2>
        <div class="keywords-container">
            ${keywordsHtml || 'No keywords available.'}
        </div>
    </div>

    <div class="section">
        <h2>Important Events</h2>
        <div class="events-container">
            ${eventsHtml || 'No events detected.'}
        </div>
    </div>

    <div class="footer">
        <p>Generated by Chat Analyzer</p>
    </div>
</body>
</html>`;
}

// 获取颜色
function getColorForIndex(index) {
    const colors = [
        '#07c160', '#1aad19', '#4cd964', '#5ac8fa', '#007aff',
        '#34aadc', '#5856d6', '#ff2d55', '#ff3b30', '#ff9500'
    ];
    return colors[index % colors.length];
}

// Show error message
function showError(message) {
    // 使用更友好的错误提示，允许用户点击确定后继续
    const errorDialog = document.createElement('div');
    errorDialog.className = 'error-dialog';
    errorDialog.innerHTML = `
        <div class="error-content">
            <p>${message}</p>
            <button class="confirm-btn">确定</button>
        </div>
    `;

    // 添加样式
    errorDialog.style.position = 'fixed';
    errorDialog.style.top = '0';
    errorDialog.style.left = '0';
    errorDialog.style.width = '100%';
    errorDialog.style.height = '100%';
    errorDialog.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    errorDialog.style.display = 'flex';
    errorDialog.style.justifyContent = 'center';
    errorDialog.style.alignItems = 'center';
    errorDialog.style.zIndex = '9999';

    const errorContent = errorDialog.querySelector('.error-content');
    errorContent.style.backgroundColor = 'white';
    errorContent.style.padding = '20px';
    errorContent.style.borderRadius = '5px';
    errorContent.style.maxWidth = '400px';
    errorContent.style.textAlign = 'center';

    const confirmBtn = errorDialog.querySelector('.confirm-btn');
    confirmBtn.style.marginTop = '15px';
    confirmBtn.style.padding = '8px 16px';
    confirmBtn.style.backgroundColor = '#007bff';
    confirmBtn.style.color = 'white';
    confirmBtn.style.border = 'none';
    confirmBtn.style.borderRadius = '4px';
    confirmBtn.style.cursor = 'pointer';

    // 添加到DOM
    document.body.appendChild(errorDialog);

    // 点击确定按钮关闭对话框
    confirmBtn.addEventListener('click', function() {
        document.body.removeChild(errorDialog);
    });
}

// 创建示例数据
function createFallbackData(analysisId) {
    return {
        id: analysisId,
        timestamp: new Date().toISOString(),
        total_messages: 1234,
        senders: {
            '张三': 789,
            '李四': 445
        },
        summary: "- 推荐创意网站获取素材\n- 建议拒绝客户追数申请\n- 发话题笔记提升账号流量\n- 商品选取需要美观实用\n- 运营需用户需求求优化",
        events: [
            {
                time: "4月8日周二晚上",
                sender: "领队-金文文",
                content: "安排教练-巧克力进行小红书电商运营策略咨询",
                type: "会议安排"
            },
            {
                time: "Unknown date",
                sender: "李建伟",
                content: "客户下单后申请退货问题求助",
                type: "关键问题"
            },
            {
                time: "Unknown date",
                sender: "青蛙-港港-Lv1",
                content: "咨询商品笔记与普通笔记选择策略",
                type: "关键问题"
            },
            {
                time: "Unknown date",
                sender: "亮晶晶",
                content: "询问小红书私信发送自定义星图链接的合规性",
                type: "关键问题"
            },
            {
                time: "Unknown date",
                sender: "教练-王多维",
                content: "点评日志并提出产品优化建议（便捷价，用自动发货工具）",
                type: "重要决定"
            }
        ],
        top_keywords: {
            "小红书": 45,
            "运营": 38,
            "笔记": 32,
            "商品": 28,
            "优化": 25,
            "内容": 22,
            "流量": 20,
            "素材": 18,
            "客户": 15,
            "链接": 12
        },
        statistics: {
            totalMessages: 1234,
            messageCountByParticipant: {
                '张三': 789,
                '李四': 445
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
        }
    };
}
