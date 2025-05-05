// Upload page JavaScript for ChatViz

document.addEventListener('DOMContentLoaded', function() {
    // Step navigation
    const steps = ['step-file-upload', 'step-contacts', 'step-analyze'];
    let currentStepIndex = 0;

    // DOM elements
    const chatUploadForm = document.getElementById('chat-upload-form');
    const chatFile = document.getElementById('chat-file');
    const fileName = document.getElementById('file-name');
    const chatPlatform = document.getElementById('chat-platform');
    const fileEncoding = document.getElementById('file-encoding');
    const continueToContactsBtn = document.getElementById('continue-to-contacts');
    const contactSearch = document.getElementById('contact-search');
    const contactsList = document.getElementById('contacts-list');
    const selectedContactsList = document.getElementById('selected-contacts-list');
    const selectedCountEl = document.getElementById('selected-count');
    const continueToAnalyzeBtn = document.getElementById('continue-to-analyze');
    const backToUploadBtn = document.getElementById('back-to-upload');
    const startAnalysisBtn = document.getElementById('start-analysis');
    const backToContactsBtn = document.getElementById('back-to-contacts');

    // State variables
    let uploadedFiles = [];
    let selectedContacts = [];
    let allContacts = [];

    // Initialize

    // File upload handler
    if (chatFile) {
        chatFile.addEventListener('change', function() {
            if (this.files.length > 0) {
                uploadedFiles = Array.from(this.files);

                if (this.files.length === 1) {
                    fileName.textContent = this.files[0].name;
                } else {
                    fileName.textContent = `${this.files.length} files selected`;
                }

                // Auto-detect chat platform based on file content
                if (chatPlatform.value === 'auto') {
                    detectChatPlatform(this.files[0]);
                }

                continueToContactsBtn.disabled = false;
            } else {
                fileName.textContent = '';
                uploadedFiles = [];
                continueToContactsBtn.disabled = true;
            }
        });
    }

    // Continue to contacts button
    if (continueToContactsBtn) {
        continueToContactsBtn.addEventListener('click', function() {
            if (uploadedFiles.length === 0) {
                showError('Please select at least one chat file to upload');
                return;
            }

            // Upload the files
            const formData = new FormData();
            uploadedFiles.forEach(file => {
                formData.append('files', file);
            });
            formData.append('platform', chatPlatform.value);
            formData.append('encoding', fileEncoding.value);

            // Show loading state
            contactsList.innerHTML = '<div class="loading-spinner">Analyzing chat data...</div>';

            // Go to contacts step immediately to show loading state
            goToStep(1);

            // Process the files and extract participants
            // In a real implementation, this would be an API call
            // For demo purposes, we'll simulate the process
            setTimeout(() => {
                // Simulate processing
                extractParticipants(uploadedFiles)
                    .then(participants => {
                        allContacts = participants;
                        renderContacts(allContacts);
                    })
                    .catch(error => {
                        showError('Error processing files: ' + error.message);
                        contactsList.innerHTML = '<div class="error-message">Failed to process chat files. Please try again.</div>';
                    });
            }, 1500);
        });
    }

    // Back buttons
    if (backToUploadBtn) {
        backToUploadBtn.addEventListener('click', function() {
            goToStep(0);
        });
    }

    if (backToContactsBtn) {
        backToContactsBtn.addEventListener('click', function() {
            goToStep(1);
        });
    }

    // Contact search
    if (contactSearch) {
        contactSearch.addEventListener('input', function() {
            filterContacts(this.value);
        });
    }

    // Continue to analyze button
    if (continueToAnalyzeBtn) {
        continueToAnalyzeBtn.addEventListener('click', function() {
            if (selectedContacts.length === 0) {
                showError('Please select at least one contact');
                return;
            }

            goToStep(3); // Go to analyze step
        });
    }

    // Start analysis button
    if (startAnalysisBtn) {
        startAnalysisBtn.addEventListener('click', function() {
            startAnalysis();
        });
    }

    // Step navigation
    function goToStep(index) {
        if (index < 0 || index >= steps.length) return;

        // Hide current step
        document.getElementById(steps[currentStepIndex]).classList.remove('active');

        // Show new step
        document.getElementById(steps[index]).classList.add('active');

        currentStepIndex = index;
    }

    // Load contacts from database
    function loadContacts() {
        if (!contactsList) return;

        // Show loading
        contactsList.innerHTML = '<div class="loading-spinner">Loading contacts...</div>';

        // Fetch contacts
        fetch('/api/contacts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                db_path: dbPath,
                phone: userAccount.phone,
                wechat_id: userAccount.wechatId
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success && result.contacts) {
                allContacts = result.contacts;
                renderContacts(allContacts);
            } else {
                contactsList.innerHTML = '<div class="error-message">Failed to load contacts: ' +
                    (result.error || 'Unknown error') + '</div>';
            }
        })
        .catch(error => {
            contactsList.innerHTML = '<div class="error-message">Error: ' + error.message + '</div>';
        });
    }

    // Render contacts list
    function renderContacts(contacts) {
        if (!contactsList) return;

        if (contacts.length === 0) {
            contactsList.innerHTML = '<div class="empty-message">No contacts found</div>';
            return;
        }

        contactsList.innerHTML = '';

        contacts.forEach(contact => {
            const contactItem = document.createElement('div');
            contactItem.className = 'contact-item';
            contactItem.setAttribute('data-id', contact.id);

            if (selectedContacts.some(c => c.id === contact.id)) {
                contactItem.classList.add('selected');
            }

            const avatar = document.createElement('div');
            avatar.className = 'contact-avatar';
            avatar.textContent = getInitials(contact.name);

            const name = document.createElement('div');
            name.className = 'contact-name';
            name.textContent = contact.name;

            contactItem.appendChild(avatar);
            contactItem.appendChild(name);

            contactItem.addEventListener('click', function() {
                toggleContactSelection(contact);
            });

            contactsList.appendChild(contactItem);
        });
    }

    // Toggle contact selection
    function toggleContactSelection(contact) {
        const isSelected = selectedContacts.some(c => c.id === contact.id);

        if (isSelected) {
            // Remove from selection
            selectedContacts = selectedContacts.filter(c => c.id !== contact.id);
        } else {
            // Add to selection
            selectedContacts.push(contact);
        }

        // Update UI
        updateSelectedContacts();

        // Toggle selected class on contact item
        const contactItem = document.querySelector(`.contact-item[data-id="${contact.id}"]`);
        if (contactItem) {
            contactItem.classList.toggle('selected', !isSelected);
        }

        // Enable/disable continue button
        if (continueToAnalyzeBtn) {
            continueToAnalyzeBtn.disabled = selectedContacts.length === 0;
        }
    }

    // Update selected contacts UI
    function updateSelectedContacts() {
        if (!selectedContactsList || !selectedCountEl) return;

        selectedContactsList.innerHTML = '';
        selectedCountEl.textContent = selectedContacts.length;

        selectedContacts.forEach(contact => {
            const contactItem = document.createElement('div');
            contactItem.className = 'selected-contact';

            contactItem.innerHTML = `
                <span>${contact.name}</span>
                <span class="remove-contact" data-id="${contact.id}">×</span>
            `;

            contactItem.querySelector('.remove-contact').addEventListener('click', function(e) {
                e.stopPropagation();
                toggleContactSelection(contact);
            });

            selectedContactsList.appendChild(contactItem);
        });
    }

    // Filter contacts by search term
    function filterContacts(searchTerm) {
        if (!searchTerm) {
            renderContacts(allContacts);
            return;
        }

        const filtered = allContacts.filter(contact =>
            contact.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        renderContacts(filtered);
    }

    // Start analysis process
    function startAnalysis() {
        if (selectedContacts.length === 0) {
            showError('Please select at least one contact');
            return;
        }

        // Get analysis options
        const options = {
            summary: document.getElementById('option-summary')?.checked || false,
            stats: document.getElementById('option-stats')?.checked || false,
            sentiment: document.getElementById('option-sentiment')?.checked || false,
            topics: document.getElementById('option-topics')?.checked || false
        };

        const startDate = document.getElementById('start-date')?.value || '';
        const endDate = document.getElementById('end-date')?.value || '';

        // Hide options and show progress
        document.getElementById('analysis-progress').style.display = 'block';
        startAnalysisBtn.disabled = true;
        backToContactsBtn.disabled = true;

        // Progress simulation
        let progress = 0;
        const progressBar = document.getElementById('progress-bar');
        const progressStatus = document.getElementById('progress-status');

        const progressInterval = setInterval(() => {
            progress += 5;
            progressBar.style.width = progress + '%';

            if (progress < 30) {
                progressStatus.textContent = 'Preparing data...';
            } else if (progress < 60) {
                progressStatus.textContent = 'Analyzing conversations...';
            } else if (progress < 85) {
                progressStatus.textContent = 'Generating visualizations...';
            } else {
                progressStatus.textContent = 'Finalizing results...';
            }

            if (progress >= 100) {
                clearInterval(progressInterval);
                showResults();
            }
        }, 200);

        // In a real app, you would make actual API calls here
        // For demonstration, we're just simulating progress
    }

    // Show analysis results
    function showResults() {
        document.getElementById('analysis-progress').style.display = 'none';
        document.getElementById('analysis-results').style.display = 'block';

        // Sample results
        const resultsList = document.getElementById('results-list');
        if (resultsList) {
            resultsList.innerHTML = '';

            selectedContacts.forEach(contact => {
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';

                resultItem.innerHTML = `
                    <div class="result-info">
                        <div class="result-name">${contact.name}</div>
                        <div class="result-details">10,234 messages, 2023-01-01 to 2023-04-30</div>
                    </div>
                    <div class="result-actions">
                        <button class="btn primary view-result" data-id="${contact.id}">View</button>
                        <button class="btn secondary download-result" data-id="${contact.id}">Download</button>
                    </div>
                `;

                resultItem.querySelector('.view-result').addEventListener('click', function() {
                    window.location.href = `/results?id=sample_${contact.id}`;
                });

                resultItem.querySelector('.download-result').addEventListener('click', function() {
                    window.location.href = `/api/download/sample_${contact.id}`;
                });

                resultsList.appendChild(resultItem);
            });
        }

        // View all results button
        const viewAllResultsBtn = document.getElementById('view-all-results');
        if (viewAllResultsBtn) {
            viewAllResultsBtn.addEventListener('click', function() {
                window.location.href = '/results?id=sample_all';
            });
        }
    }

    // Detect chat platform based on file content
    function detectChatPlatform(file) {
        // In a real implementation, this would analyze the file content
        // For demo purposes, we'll use the file extension
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
            // Check if it's a WeChat HTML export
            if (file.size < 5000000) { // If file is small enough, read it
                const reader = new FileReader();
                reader.onload = function(e) {
                    const content = e.target.result;
                    if (content.includes('wechat') || content.includes('微信')) {
                        chatPlatform.value = 'wechat';
                    } else if (content.includes('telegram')) {
                        chatPlatform.value = 'telegram';
                    } else if (content.includes('whatsapp')) {
                        chatPlatform.value = 'whatsapp';
                    } else if (content.includes('qq')) {
                        chatPlatform.value = 'qq';
                    }
                };
                reader.readAsText(file.slice(0, 10000)); // Read just the beginning
            }
        } else if (fileName.endsWith('.txt')) {
            // For TXT files, we'll need to check the content
            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                if (content.includes('wechat') || content.includes('微信')) {
                    chatPlatform.value = 'wechat';
                } else if (content.includes('telegram')) {
                    chatPlatform.value = 'telegram';
                } else if (content.includes('whatsapp')) {
                    chatPlatform.value = 'whatsapp';
                } else if (content.includes('qq')) {
                    chatPlatform.value = 'qq';
                }
            };
            reader.readAsText(file.slice(0, 10000)); // Read just the beginning
        }
    }

    // Extract participants from chat files
    async function extractParticipants(files) {
        // In a real implementation, this would parse the files
        // For demo purposes, we'll return mock data
        return new Promise((resolve) => {
            // Simulate different participants based on file type
            const participants = [];

            // Add some mock participants
            participants.push({ id: 'user1', name: 'John Doe' });
            participants.push({ id: 'user2', name: 'Jane Smith' });
            participants.push({ id: 'user3', name: 'Alex Johnson' });
            participants.push({ id: 'user4', name: 'Sarah Williams' });
            participants.push({ id: 'user5', name: 'Michael Brown' });

            // If it's a group chat, add more participants
            if (files.some(file => file.name.includes('group') || file.size > 100000)) {
                participants.push({ id: 'user6', name: 'Emily Davis' });
                participants.push({ id: 'user7', name: 'David Wilson' });
                participants.push({ id: 'user8', name: 'Lisa Taylor' });
                participants.push({ id: 'user9', name: 'Robert Anderson' });
                participants.push({ id: 'user10', name: 'Jennifer Martinez' });
            }

            resolve(participants);
        });
    }

    // Utility functions
    function getInitials(name) {
        if (!name) return '?';

        const words = name.split(' ');
        if (words.length === 1) {
            return name.charAt(0).toUpperCase();
        } else {
            return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
        }
    }

    function showError(message) {
        alert(message);
    }
});