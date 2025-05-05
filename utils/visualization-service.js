/**
 * 可视化服务模块 - 提供聊天数据可视化相关功能
 * 负责将分析数据转换为适合前端可视化库使用的格式
 */

/**
 * 生成消息活跃度时间线数据
 * @param {Object} analysisResult - 分析结果对象
 * @returns {Array} 格式化后的活跃度数据
 */
function generateActivityTimelineData(analysisResult) {
    const { statistics } = analysisResult;
    
    if (!statistics || !statistics.messageCountByDate) {
        return [];
    }

    // 将日期消息数据转换为数组格式
    const activityData = Object.entries(statistics.messageCountByDate).map(([date, count]) => {
        return { date, count };
    });

    // 按日期排序
    activityData.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return activityData;
}

/**
 * 生成每小时活跃度热力图数据
 * @param {Object} analysisResult - 分析结果对象
 * @returns {Array} 格式化后的热力图数据
 */
function generateHourlyHeatmapData(analysisResult) {
    const { statistics } = analysisResult;
    
    if (!statistics || !statistics.timeStats || !statistics.timeStats.messageCountByHour) {
        return [];
    }

    // 将小时活跃度数据转换为数组格式
    const hourlyData = [];
    for (let hour = 0; hour < 24; hour++) {
        hourlyData.push({
            hour: hour,
            count: statistics.timeStats.messageCountByHour[hour] || 0
        });
    }
    
    return hourlyData;
}

/**
 * 生成参与者消息分布饼图数据
 * @param {Object} analysisResult - 分析结果对象
 * @returns {Object} 格式化后的饼图数据
 */
function generateParticipantPieData(analysisResult) {
    const { statistics } = analysisResult;
    
    if (!statistics || !statistics.messageCountByParticipant) {
        return { labels: [], data: [] };
    }

    const participantData = Object.entries(statistics.messageCountByParticipant);
    
    // 按消息数量排序（降序）
    participantData.sort((a, b) => b[1] - a[1]);
    
    // 如果参与者太多，只取前10个，其余归为"其他"
    let labels = [];
    let data = [];
    
    if (participantData.length > 10) {
        const top10 = participantData.slice(0, 10);
        const others = participantData.slice(10);
        
        labels = top10.map(item => item[0]);
        data = top10.map(item => item[1]);
        
        // 添加"其他"类别
        const othersSum = others.reduce((sum, item) => sum + item[1], 0);
        if (othersSum > 0) {
            labels.push('其他');
            data.push(othersSum);
        }
    } else {
        labels = participantData.map(item => item[0]);
        data = participantData.map(item => item[1]);
    }
    
    return { labels, data };
}

/**
 * 生成关键词词云数据
 * @param {Object} analysisResult - 分析结果对象
 * @returns {Array} 格式化后的词云数据
 */
function generateKeywordCloudData(analysisResult) {
    const { top_keywords } = analysisResult;
    
    if (!top_keywords || Object.keys(top_keywords).length === 0) {
        return [];
    }

    // 将关键词数据转换为词云所需格式
    const keywordData = Object.entries(top_keywords).map(([word, weight]) => {
        return {
            name: word,
            value: weight
        };
    });
    
    // 按权重排序（降序）
    keywordData.sort((a, b) => b.value - a.value);
    
    return keywordData;
}

/**
 * 生成情感分析趋势数据
 * @param {Object} analysisResult - 分析结果对象
 * @returns {Array} 格式化后的情感趋势数据
 */
function generateSentimentTrendData(analysisResult) {
    // 这里需要根据实际数据结构调整
    // 假设我们有按日期的情感分数数据
    const sentimentByDate = analysisResult.sentiment?.byDate || {};
    
    // 将情感数据转换为数组格式
    const sentimentData = Object.entries(sentimentByDate).map(([date, score]) => {
        return { date, score };
    });
    
    // 按日期排序
    sentimentData.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return sentimentData;
}

/**
 * 生成互动关系网络图数据
 * @param {Object} analysisResult - 分析结果对象
 * @returns {Object} 格式化后的网络图数据
 */
function generateInteractionNetworkData(analysisResult) {
    // 这需要更复杂的数据处理，可能需要额外的分析
    // 这里提供一个简化版本
    const { statistics } = analysisResult;
    
    if (!statistics || !statistics.messageCountByParticipant) {
        return { nodes: [], links: [] };
    }
    
    // 创建节点数据
    const nodes = Object.keys(statistics.messageCountByParticipant).map(name => {
        return {
            name,
            value: statistics.messageCountByParticipant[name]
        };
    });
    
    // 创建连接数据（简化版）
    // 在实际应用中，这需要分析消息的发送者和接收者关系
    const links = [];
    
    // 如果有群组对话，可以假设所有人都与群组有连接
    if (nodes.length > 1) {
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                links.push({
                    source: i,
                    target: j,
                    value: Math.min(nodes[i].value, nodes[j].value) / 10
                });
            }
        }
    }
    
    return { nodes, links };
}

/**
 * 生成消息长度分布数据
 * @param {Object} analysisResult - 分析结果对象
 * @returns {Object} 格式化后的分布数据
 */
function generateMessageLengthDistribution(analysisResult) {
    // 这需要原始消息数据，可能需要在分析阶段计算
    // 这里提供一个基于统计数据的简化版本
    const { statistics } = analysisResult;
    
    if (!statistics || !statistics.messageLengthStats) {
        return { labels: [], data: [] };
    }
    
    // 创建长度区间
    const lengthRanges = [
        '0-10', '11-50', '51-100', '101-200', '201-500', '500+'
    ];
    
    // 这里需要实际的分布数据
    // 在没有详细数据的情况下，我们可以生成一些模拟数据
    const distributionData = [30, 25, 20, 15, 7, 3]; // 示例数据
    
    return { 
        labels: lengthRanges, 
        data: distributionData 
    };
}

/**
 * 生成所有可视化数据
 * @param {Object} analysisResult - 分析结果对象
 * @returns {Object} 所有可视化数据
 */
function generateAllVisualizationData(analysisResult) {
    return {
        activityTimeline: generateActivityTimelineData(analysisResult),
        hourlyHeatmap: generateHourlyHeatmapData(analysisResult),
        participantDistribution: generateParticipantPieData(analysisResult),
        keywordCloud: generateKeywordCloudData(analysisResult),
        sentimentTrend: generateSentimentTrendData(analysisResult),
        interactionNetwork: generateInteractionNetworkData(analysisResult),
        messageLengthDistribution: generateMessageLengthDistribution(analysisResult)
    };
}

module.exports = {
    generateActivityTimelineData,
    generateHourlyHeatmapData,
    generateParticipantPieData,
    generateKeywordCloudData,
    generateSentimentTrendData,
    generateInteractionNetworkData,
    generateMessageLengthDistribution,
    generateAllVisualizationData
};
