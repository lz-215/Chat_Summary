// Results page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tabs
    initTabs();
    
    // Load analysis data
    loadAnalysisData();
    
    // Initialize event listeners
    initEventListeners();
});

// Initialize tab functionality
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Activate first tab by default
    if (tabButtons.length > 0) {
        tabButtons[0].click();
    }
}

// Initialize event listeners
function initEventListeners() {
    // Share button
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', shareAnalysis);
    }
    
    // Download button
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadReport);
    }
    
    // Topic items click
    document.addEventListener('click', function(e) {
        if (e.target.closest('.topic-item')) {
            const topicItem = e.target.closest('.topic-item');
            const topic = topicItem.getAttribute('data-topic');
            showTopicMessages(topic);
        }
    });
    
    // Timeline search
    const timelineSearch = document.querySelector('.search-container input');
    if (timelineSearch) {
        timelineSearch.addEventListener('input', function() {
            searchTimeline(this.value);
        });
    }
}

// Load analysis data from the server
function loadAnalysisData() {
    const analysisId = getAnalysisIdFromUrl();
    
    if (!analysisId) {
        showError('Analysis ID not found in URL');
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    
    // Fetch analysis data from server
    fetch(`/api/analysis/${analysisId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch analysis data');
            }
            return response.json();
        })
        .then(data => {
            // Remove loading placeholders
            setLoadingState(false);
            
            // Populate data on the page
            populateMetadata(data.metadata);
            populateStatistics(data.statistics);
            populateSummary(data.summary);
            populateTopics(data.topics);
            populateSentiment(data.sentiment);
            populateTimeline(data.timeline);
            
            // Initialize charts
            initCharts(data);
        })
        .catch(error => {
            console.error('Error loading analysis data:', error);
            showError('Failed to load analysis data. Please try again.');
            setLoadingState(false);
        });
}

// Get analysis ID from URL
function getAnalysisIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Set loading state for components
function setLoadingState(isLoading) {
    const loadingPlaceholders = document.querySelectorAll('.loading-placeholder');
    const contentElements = document.querySelectorAll('.content-element');
    
    if (isLoading) {
        loadingPlaceholders.forEach(el => el.style.display = 'block');
        contentElements.forEach(el => el.style.display = 'none');
    } else {
        loadingPlaceholders.forEach(el => el.style.display = 'none');
        contentElements.forEach(el => el.style.display = 'block');
    }
}

// Populate metadata section
function populateMetadata(metadata) {
    if (!metadata) return;
    
    document.getElementById('chat-name').textContent = metadata.chatName || 'N/A';
    document.getElementById('participants').textContent = metadata.participants?.join(', ') || 'N/A';
    document.getElementById('date-range').textContent = formatDateRange(metadata.startDate, metadata.endDate);
    document.getElementById('total-messages').textContent = formatNumber(metadata.totalMessages) || '0';
}

// Populate statistics cards
function populateStatistics(statistics) {
    if (!statistics) return;
    
    document.getElementById('total-messages-value').textContent = formatNumber(statistics.totalMessages) || '0';
    document.getElementById('active-days-value').textContent = statistics.activeDays || '0';
    document.getElementById('avg-daily-value').textContent = statistics.avgMessagesPerDay?.toFixed(1) || '0';
    document.getElementById('most-active-user-value').textContent = statistics.mostActiveUser || 'N/A';
}

// Populate summary section
function populateSummary(summary) {
    if (!summary) return;
    
    document.getElementById('summary-text').textContent = summary.text || 'No summary available.';
    
    // Populate activity highlights if available
    if (summary.activityHighlights && summary.activityHighlights.length > 0) {
        const activityList = document.getElementById('activity-highlights');
        activityList.innerHTML = '';
        
        summary.activityHighlights.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            activityList.appendChild(li);
        });
    }
    
    // Populate events if available
    if (summary.events && summary.events.length > 0) {
        const eventsList = document.getElementById('events-list');
        eventsList.innerHTML = '';
        
        summary.events.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item';
            
            eventItem.innerHTML = `
                <div class="event-date">${formatDate(event.date)}</div>
                <div class="event-title">${event.title}</div>
                <div class="event-description">${event.description}</div>
            `;
            
            eventsList.appendChild(eventItem);
        });
    }
}

// Populate topics section
function populateTopics(topics) {
    if (!topics || topics.length === 0) {
        document.getElementById('topics-list').innerHTML = '<p>No significant topics found.</p>';
        return;
    }
    
    const topicsList = document.getElementById('topics-list');
    topicsList.innerHTML = '';
    
    topics.forEach(topic => {
        const topicItem = document.createElement('div');
        topicItem.className = 'topic-item';
        topicItem.setAttribute('data-topic', topic.name);
        
        topicItem.innerHTML = `
            <span>${topic.name}</span>
            <span class="topic-count">${topic.count}</span>
        `;
        
        topicsList.appendChild(topicItem);
    });
}

// Show messages related to a specific topic
function showTopicMessages(topic) {
    alert(`Messages related to topic "${topic}" will be displayed here.`);
    // In a real implementation, you would fetch and display the messages for this topic
}

// Populate sentiment section
function populateSentiment(sentiment) {
    if (!sentiment) return;
    
    // Update sentiment score
    const scoreValue = document.getElementById('sentiment-score-value');
    if (scoreValue) {
        scoreValue.textContent = sentiment.score.toFixed(1);
        
        // Position the indicator marker based on sentiment score
        const scoreIndicator = document.querySelector('.score-indicator');
        if (scoreIndicator) {
            // Convert score from -1...1 to 0...100 for positioning
            const position = ((sentiment.score + 1) / 2) * 100;
            scoreIndicator.style.left = `${position}%`;
        }
    }
    
    // Populate positive messages
    populateMessagesList('positive-messages', sentiment.positiveMessages);
    
    // Populate negative messages
    populateMessagesList('negative-messages', sentiment.negativeMessages);
}

// Populate a list of messages
function populateMessagesList(containerId, messages) {
    const container = document.getElementById(containerId);
    if (!container || !messages || messages.length === 0) {
        if (container) {
            container.innerHTML = '<p>No messages to display.</p>';
        }
        return;
    }
    
    container.innerHTML = '';
    
    messages.forEach(message => {
        const messageItem = document.createElement('div');
        messageItem.className = `message-item ${containerId === 'positive-messages' ? 'positive-message' : 'negative-message'}`;
        
        messageItem.innerHTML = `
            <div class="message-sender">${message.sender}</div>
            <div class="message-content">${message.content}</div>
            <div class="message-time">${formatDateTime(message.timestamp)}</div>
            <div class="message-score">${message.score.toFixed(1)}</div>
        `;
        
        container.appendChild(messageItem);
    });
}

// Populate timeline section
function populateTimeline(timeline) {
    if (!timeline || timeline.length === 0) {
        document.getElementById('timeline').innerHTML = '<p>No timeline data available.</p>';
        return;
    }
    
    const timelineContainer = document.getElementById('timeline');
    timelineContainer.innerHTML = '';
    
    // Group messages by date
    const messagesByDate = {};
    
    timeline.forEach(message => {
        const date = new Date(message.timestamp).toLocaleDateString();
        
        if (!messagesByDate[date]) {
            messagesByDate[date] = [];
        }
        
        messagesByDate[date].push(message);
    });
    
    // Create timeline items for each date
    Object.keys(messagesByDate).sort((a, b) => new Date(b) - new Date(a)).forEach(date => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        
        const dateHeading = document.createElement('div');
        dateHeading.className = 'timeline-date';
        dateHeading.textContent = formatDate(date);
        
        const messagesContainer = document.createElement('div');
        messagesContainer.className = 'timeline-messages';
        
        // Add messages for this date
        messagesByDate[date].forEach(message => {
            const messageItem = document.createElement('div');
            messageItem.className = 'message-item';
            
            messageItem.innerHTML = `
                <div class="message-sender">${message.sender}</div>
                <div class="message-content">${message.content}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            `;
            
            messagesContainer.appendChild(messageItem);
        });
        
        timelineItem.appendChild(dateHeading);
        timelineItem.appendChild(messagesContainer);
        timelineContainer.appendChild(timelineItem);
    });
}

// Search timeline
function searchTimeline(query) {
    if (!query) {
        // Show all timeline items
        document.querySelectorAll('.timeline-item').forEach(item => {
            item.style.display = 'block';
        });
        return;
    }
    
    query = query.toLowerCase();
    
    // Filter timeline items based on query
    document.querySelectorAll('.timeline-item').forEach(item => {
        const messageContents = item.querySelectorAll('.message-content');
        const messageSenders = item.querySelectorAll('.message-sender');
        
        let match = false;
        
        // Check if query matches any message content or sender
        messageContents.forEach(content => {
            if (content.textContent.toLowerCase().includes(query)) {
                match = true;
            }
        });
        
        messageSenders.forEach(sender => {
            if (sender.textContent.toLowerCase().includes(query)) {
                match = true;
            }
        });
        
        item.style.display = match ? 'block' : 'none';
    });
}

// Initialize charts
function initCharts(data) {
    if (!data) return;
    
    // Activity chart
    initActivityChart(data.activityData);
    
    // Sentiment trend chart
    initSentimentTrendChart(data.sentimentTrend);
    
    // User participation chart
    initUserParticipationChart(data.userParticipation);
}

// Initialize activity chart
function initActivityChart(activityData) {
    if (!activityData || !window.Chart) return;
    
    const ctx = document.getElementById('activity-chart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: activityData.map(item => item.date),
            datasets: [{
                label: 'Message Count',
                data: activityData.map(item => item.count),
                borderColor: '#07c160',
                backgroundColor: 'rgba(7, 193, 96, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
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
    });
}

// Initialize sentiment trend chart
function initSentimentTrendChart(sentimentTrend) {
    if (!sentimentTrend || !window.Chart) return;
    
    const ctx = document.getElementById('sentiment-trend-chart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: sentimentTrend.map(item => item.date),
            datasets: [{
                label: 'Sentiment Score',
                data: sentimentTrend.map(item => item.score),
                borderColor: '#07c160',
                backgroundColor: 'rgba(7, 193, 96, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    min: -1,
                    max: 1,
                    ticks: {
                        callback: function(value) {
                            if (value === -1) return 'Negative';
                            if (value === 0) return 'Neutral';
                            if (value === 1) return 'Positive';
                            return '';
                        }
                    }
                }
            }
        }
    });
}

// Initialize user participation chart
function initUserParticipationChart(userParticipation) {
    if (!userParticipation || !window.Chart) return;
    
    const ctx = document.getElementById('user-participation-chart');
    if (!ctx) return;
    
    // Generate colors for each user
    const colors = generateColors(userParticipation.length);
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: userParticipation.map(item => item.user),
            datasets: [{
                data: userParticipation.map(item => item.count),
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} messages (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Generate colors for chart
function generateColors(count) {
    const colors = [
        '#07c160', '#1aad19', '#4cd964', '#5ac8fa', '#007aff', 
        '#34aadc', '#5856d6', '#ff2d55', '#ff3b30', '#ff9500'
    ];
    
    // If we need more colors than available, cycle through the array
    return Array(count).fill().map((_, i) => colors[i % colors.length]);
}

// Share analysis
function shareAnalysis() {
    // Get current URL
    const url = window.location.href;
    
    // Use Web Share API if available
    if (navigator.share) {
        navigator.share({
            title: 'WeChat Chat Analysis',
            text: 'Check out this analysis of our WeChat conversation!',
            url: url
        })
        .catch(error => {
            console.error('Error sharing:', error);
            fallbackShare(url);
        });
    } else {
        fallbackShare(url);
    }
}

// Fallback share method
function fallbackShare(url) {
    // Copy to clipboard
    navigator.clipboard.writeText(url)
        .then(() => {
            alert('Link copied to clipboard!');
        })
        .catch(error => {
            console.error('Failed to copy link:', error);
            prompt('Copy this link to share:', url);
        });
}

// Download report
function downloadReport() {
    const analysisId = getAnalysisIdFromUrl();
    
    if (!analysisId) {
        showError('Analysis ID not found');
        return;
    }
    
    // Redirect to download endpoint
    window.location.href = `/api/analysis/${analysisId}/download`;
}

// Show error message
function showError(message) {
    alert(message);
}

// Utility functions

// Format number with commas
function formatNumber(num) {
    if (num === undefined || num === null) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Format time
function formatTime(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Format date and time
function formatDateTime(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    });
}

// Format date range
function formatDateRange(startDate, endDate) {
    if (!startDate || !endDate) return 'N/A';
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}