
  
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const closeSidebar = document.getElementById('close-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const chatWindow = document.getElementById('chat-window');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatHistory = document.getElementById('chat-history');
    const mainContent = document.getElementById('main-content');

    // Sidebar State Management
    let isSidebarOpen = false;

    // Toggle Sidebar
    function toggleSidebar() {
        isSidebarOpen = !isSidebarOpen;
        sidebar.classList.toggle('visible', isSidebarOpen);
        sidebarOverlay.classList.toggle('visible', isSidebarOpen);

        // Prevent scrolling on mobile
        if (window.innerWidth <= 768) {
            document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
        }
    }

    // Close Sidebar
    function closeSidebarFn() {
        isSidebarOpen = false;
        sidebar.classList.remove('visible');
        sidebarOverlay.classList.remove('visible');
        document.body.style.overflow = '';
    }

    // Event Listeners for Sidebar
    menuToggle.addEventListener('click', toggleSidebar);
    closeSidebar.addEventListener('click', closeSidebarFn);
    sidebarOverlay.addEventListener('click', closeSidebarFn);

    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Send message on Enter (Shift+Enter for new line)
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Send button click handler
    sendButton.addEventListener('click', sendMessage);

    // New chat button
    newChatBtn.addEventListener('click', startNewChat);

    // Initialize chat history items
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                closeSidebarFn();
            }
            // Remove active class from all items
            document.querySelectorAll('.chat-item').forEach(i => {
                i.classList.remove('active');
            });
            // Add active class to clicked item
            this.classList.add('active');
        });
    });

    // Feature card click handlers
    document.querySelectorAll('.feature-card').forEach((card) => {
        card.addEventListener('click', () => {
            const question = card.querySelector('h3').textContent + "?";
            messageInput.value = question;
            setTimeout(sendMessage, 300);
        });
    });

    // Send Message Function
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        addMessage(message, 'user');
        messageInput.value = '';
        messageInput.style.height = 'auto';
        chatWindow.scrollTop = chatWindow.scrollHeight;

        // Hide welcome message if first message
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage && document.querySelectorAll('.message').length === 1) {
            welcomeMessage.style.display = 'none';
        }

        showTypingIndicator();
        fetchAIResponse(message);
    }

    // Show typing indicator
    function showTypingIndicator() {
        typingIndicator.style.display = 'flex';
        sendButton.disabled = true;
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // Hide typing indicator
    function hideTypingIndicator() {
        typingIndicator.style.display = 'none';
        sendButton.disabled = false;
    }

    // Fetch AI Response (Gemini API)
    async function fetchAIResponse(userMessage) {
        const apiKey = "AIzaSyB5A8BsOXhnPYO9sw3cNJscHthmZl9nGRs"; // Replace with your actual API key
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: userMessage }] }]
                })
            });

            if (!response.ok) throw new Error("AI request failed a858p758i");

            const data = await response.json();

            // Extract AI response text
            const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";

            hideTypingIndicator();
            addMessage(aiResponse, 'ai');
        } catch (error) {
            hideTypingIndicator();
            addMessage("Error: Unable to get a response.", 'ai');
        }
    }

    // Add message to chat
    function addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;
        
        const messageMeta = document.createElement('div');
        messageMeta.className = 'message-meta';
        
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = formatTime(new Date());
        
        if (sender === 'user') {
            messageMeta.appendChild(timestamp);
        } else {
            const senderName = document.createElement('span');
            senderName.className = 'sender';
           // senderName.textContent = 'NexusAI';
            messageMeta.appendChild(senderName);
        //    messageMeta.appendChild(timestamp);
        }
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageMeta);
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // Start new chat
    function startNewChat() {
        chatWindow.innerHTML = `
            <div class="welcome-message">
                <h2>ការជជែកថ្មីបានចាប់ផ្តើម</h2>
                <p>តើអ្នកចង់ពិភាក្សាអ្វីជាមួយ NexusAI?</p>
            </div>
        `;
        
        if (window.innerWidth <= 768) {
            closeSidebarFn();
        }
        
        messageInput.focus();
    }

    // Format time
    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Initial focus on input
    messageInput.focus();

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && isSidebarOpen) {
            closeSidebarFn();
        }
    });
});
    