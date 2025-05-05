// Home page upload functionality for Chat Analyzer

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const chatUploadForm = document.getElementById('chat-upload-form');
    const chatFile = document.getElementById('chat-file');
    const fileName = document.getElementById('file-name');
    const analyzeButton = document.getElementById('analyze-button');

    // State variables
    let uploadedFile = null;

    // File upload handler
    if (chatFile) {
        chatFile.addEventListener('change', function() {
            if (this.files.length > 0) {
                uploadedFile = this.files[0];
                fileName.textContent = uploadedFile.name;

                // Enable analyze button
                analyzeButton.disabled = false;
            } else {
                fileName.textContent = '';
                uploadedFile = null;
                analyzeButton.disabled = true;
            }
        });
    }

    // Analyze button handler
    if (analyzeButton) {
        analyzeButton.addEventListener('click', function() {
            if (!uploadedFile) {
                showError('Please select a chat file to upload');
                return;
            }

            // 添加调试日志
            console.log('准备上传文件:', uploadedFile.name, '大小:', uploadedFile.size, 'KB');

            // Create form data
            const formData = new FormData();
            formData.append('file', uploadedFile); // 使用'file'作为字段名，与后端API匹配
            formData.append('fileName', uploadedFile.name); // 添加文件名

            // 检查FormData是否正确添加了文件
            console.log('FormData已创建，包含文件:', uploadedFile.name);

            // Show loading state
            analyzeButton.disabled = true;
            analyzeButton.textContent = 'Analyzing...';

            // Display loading message with progress bar
            const loadingMessage = document.createElement('div');
            loadingMessage.className = 'loading-message';
            loadingMessage.innerHTML = `
                <div class="spinner"></div>
                <p>Analyzing chat records, please wait...</p>
                <div class="progress-bar">
                    <div class="progress" id="analysis-progress"></div>
                </div>
                <div class="status" id="analysis-status">Uploading file...</div>
            `;
            document.body.appendChild(loadingMessage);

            // Start progress animation
            const progressBar = document.getElementById('analysis-progress');
            progressBar.style.animation = 'progress-animation 30s linear forwards';

            // Update status messages
            const statusElement = document.getElementById('analysis-status');
            let currentStep = 0;
            const statusMessages = [
                'Uploading file...',
                'Processing content...',
                'Analyzing messages...',
                'Generating summary...',
                'Extracting key events...',
                'Preparing results...'
            ];

            // Update status message every 3 seconds
            const statusInterval = setInterval(() => {
                currentStep = (currentStep + 1) % statusMessages.length;
                statusElement.textContent = statusMessages[currentStep];
            }, 3000);

            console.log('开始发送API请求...');

            // 获取当前域名，构建完整的API URL
            const apiUrl = new URL('/api/upload-chat', window.location.origin).href;
            console.log('使用API URL:', apiUrl);

            // Make API call to upload and analyze the file
            fetch(apiUrl, {
                method: 'POST',
                body: formData,
                // 增加超时时间
                timeout: 120000 // 120秒超时
            })
            .then(response => {
                console.log('收到服务器响应:', response.status, response.statusText);

                if (!response.ok) {
                    // 尝试读取错误响应内容
                    return response.text().then(text => {
                        console.error('服务器错误响应:', text);
                        throw new Error(`Server responded with status: ${response.status}, message: ${text || 'No error details'}`);
                    });
                }

                console.log('响应成功，正在解析JSON...');
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    console.log('Analysis successful, redirecting to analysis page:', data.analysis_id);
                    // Clear the status update interval
                    clearInterval(statusInterval);
                    // Update status before redirect
                    statusElement.textContent = 'Analysis complete! Redirecting...';
                    progressBar.style.width = '100%';

                    // Short delay before redirect for better UX
                    setTimeout(() => {
                        // Redirect to analysis page
                        window.location.href = `/analysis?id=${data.analysis_id}`;
                    }, 500);
                } else {
                    // Clear the status update interval
                    clearInterval(statusInterval);
                    document.body.removeChild(loadingMessage);
                    showError(data.error || 'An error occurred during analysis');
                    analyzeButton.disabled = false;
                    analyzeButton.textContent = 'Analyze Chat';
                }
            })
            .catch(error => {
                console.error('上传或分析过程中出错:', error);
                console.error('错误详情:', error.stack || '无堆栈信息');

                // 清除状态更新间隔
                clearInterval(statusInterval);

                // 移除加载消息
                try {
                    document.body.removeChild(loadingMessage);
                } catch (e) {
                    console.error('移除加载消息时出错:', e);
                }

                // 显示用户友好的错误消息
                let errorMsg = 'Error during upload or analysis';
                if (error.message) {
                    if (error.message.includes('Failed to fetch') ||
                        error.message.includes('NetworkError')) {
                        errorMsg = 'Network connection error. Please check your connection and try again.';
                    } else if (error.message.includes('timeout')) {
                        errorMsg = 'Request timeout. The server might be busy, please try again later.';
                    } else {
                        errorMsg = `Error: ${error.message}`;
                    }
                }

                showError(errorMsg);

                // 重置按钮状态
                analyzeButton.disabled = false;
                analyzeButton.textContent = 'Analyze Chat';
            });
        });
    }

    // Show error message
    function showError(message) {
        alert(message);
    }
});
