document.addEventListener('DOMContentLoaded', function () {
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

    let isSidebarOpen = false;

    function toggleSidebar() {
        isSidebarOpen = !isSidebarOpen;
        sidebar.classList.toggle('visible', isSidebarOpen);
        sidebarOverlay.classList.toggle('visible', isSidebarOpen);
        if (window.innerWidth <= 768) {
            document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
        }
    }

    function closeSidebarFn() {
        isSidebarOpen = false;
        sidebar.classList.remove('visible');
        sidebarOverlay.classList.remove('visible');
        document.body.style.overflow = '';
    }

    menuToggle.addEventListener('click', toggleSidebar);
    closeSidebar.addEventListener('click', closeSidebarFn);
    sidebarOverlay.addEventListener('click', closeSidebarFn);

    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });

    messageInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendButton.addEventListener('click', sendMessage);
    newChatBtn.addEventListener('click', startNewChat);

    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', function () {
            if (window.innerWidth <= 768) {
                closeSidebarFn();
            }
            document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });

    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('click', () => {
            const question = card.querySelector('h3').textContent + "?";
            messageInput.value = question;
            setTimeout(sendMessage, 300);
        });
    });

    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        messageInput.value = '';
        messageInput.style.height = 'auto';
        chatWindow.scrollTop = chatWindow.scrollHeight;

        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage && document.querySelectorAll('.message').length === 1) {
            welcomeMessage.style.display = 'none';
        }

        showTypingIndicator();
        fetchAIResponse(message);
    }

    function showTypingIndicator() {
        typingIndicator.style.display = 'flex';
        sendButton.disabled = true;
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function hideTypingIndicator() {
        typingIndicator.style.display = 'none';
        sendButton.disabled = false;
    }

    async function fetchAIResponse(userMessage) {
        const apiKey = "AIzaSyB5A8BsOXhnPYO9sw3cNJscHthmZl9nGRs";
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

            let aiResponse = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";

            //  "Google" with "Synh"
            aiResponse = aiResponse.replace(/Google/g, 'យ៉ាន់ ស៊ីញ');

            hideTypingIndicator();
            addMessage(aiResponse, 'ai');
        } catch (error) {
            hideTypingIndicator();
            addMessage("Error: Unable to get a response.", 'ai');
        }
    }

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
            messageMeta.appendChild(senderName);
        }

        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageMeta);
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function startNewChat() {
        chatWindow.innerHTML = `
            <div class="welcome-message">
                <h2>ការជជែកថ្មីបានចាប់ផ្តើម</h2>
                <p>តើអ្នកចង់ពិភាក្សាអ្វីជាមួយ Ai ☺️?</p>
            </div>
        `;

        if (window.innerWidth <= 768) {
            closeSidebarFn();
        }

        messageInput.focus();
    }

    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    messageInput.focus();

    window.addEventListener('resize', function () {
        if (window.innerWidth > 768 && isSidebarOpen) {
            closeSidebarFn();
        }
    });
});
