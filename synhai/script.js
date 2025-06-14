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
  const inputArea = document.getElementById('input-area');
  const attachmentButton = document.getElementById('attachment-button');
  const fileInput = document.getElementById('file-input');
  const featureCards = document.querySelectorAll('.feature-card');

  // API Configuration
  const API_KEY = "AIzaSyB5A8BsOXhnPYO9sw3cNJscHthmZl9nGRs";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  // State variables
  let isSidebarOpen = false;
  let currentChatId = null;
  let chats = {};
  let conversationHistory = [];
  let isAIResponding = false;
  let typingAnimationInterval;
  let currentTypingMessage = "";
  let lastUserMessage = null;

  // Initialize the app
  initApp();

  function initApp() {
    loadChats();
    
    if (Object.keys(chats).length === 0) {
      createNewChat();
    } else {
      const sortedChats = getSortedChats();
      currentChatId = sortedChats[0].id;
      displayChat(currentChatId);
    }
    
    // Show input area with animation
    setTimeout(() => {
      inputArea.classList.add('visible');
    }, 300);
  }

  // Chat History Functions
  function loadChats() {
    const savedChats = localStorage.getItem('synh-ai-chats');
    if (savedChats) {
      chats = JSON.parse(savedChats);
    }
  }

  function saveChats() {
    localStorage.setItem('synh-ai-chats', JSON.stringify(chats));
  }

  function getSortedChats() {
    return Object.values(chats).sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  function createNewChat() {
    currentChatId = generateChatId();
    chats[currentChatId] = {
      id: currentChatId,
      title: "ជជែកថ្មី",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveChats();
    displayChat(currentChatId);
  }

  function displayChat(chatId) {
    const chat = chats[chatId];
    if (!chat) return;
    
    currentChatId = chatId;
    conversationHistory = chat.messages.map(msg => ({
      role: msg.role,
      content: msg.text,
      file: msg.file
    }));
    
    // Clear chat window
    chatWindow.innerHTML = chat.messages.length === 0 ? 
      `<div class="welcome-message">
        <h2>${chatId === currentChatId ? 'ការជជែកថ្មី' : 'ការជជែកមុន'}</h2>
        <p>${chatId === currentChatId ? 'ខ្ញុំអាចជួយអ្នកដោះស្រាយបញ្ហា ឆ្លើយសំណួរ និងផ្តល់យោបល់ដល់អ្នក។' : 'ការជជែកពីមុន។'}</p>
      </div>` : '';
    
    // Display all messages
    chat.messages.forEach(msg => {
      addMessageToUI(msg.text, msg.role, msg.timestamp, msg.file);
    });
    
    updateActiveChatIndicator();
    updateChatHistoryUI();
  }

  function updateChatHistoryUI() {
    chatHistory.innerHTML = '';
    const sortedChats = getSortedChats();
    
    sortedChats.forEach(chat => {
      const chatItem = document.createElement('div');
      chatItem.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
      chatItem.dataset.chatId = chat.id;
      
      const chatItemContent = document.createElement('div');
      chatItemContent.className = 'chat-item-content';
      
      const chatItemTitle = document.createElement('div');
      chatItemTitle.className = 'chat-item-title';
      chatItemTitle.textContent = chat.title;
      
      const chatItemDate = document.createElement('div');
      chatItemDate.className = 'chat-item-date';
      chatItemDate.textContent = formatDate(chat.updatedAt);
      
      chatItemContent.appendChild(chatItemTitle);
      chatItemContent.appendChild(chatItemDate);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-chat';
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteChat(chat.id);
      });
      
      chatItem.appendChild(chatItemContent);
      chatItem.appendChild(deleteBtn);
      
      chatItem.addEventListener('click', () => {
        switchToChat(chat.id);
      });
      
      chatHistory.appendChild(chatItem);
    });
  }

  function switchToChat(chatId) {
    displayChat(chatId);
    if (window.innerWidth <= 768) {
      closeSidebarFn();
    }
    messageInput.focus();
  }

  function deleteChat(chatId) {
    if (Object.keys(chats).length <= 1) {
      alert("អ្នកមិនអាចលុបការជជែកចុងក្រោយបានទេ!");
      return;
    }
    
    if (confirm("តើអ្នកប្រាកដថាចង់លុបការជជែកនេះមែនទេ?")) {
      delete chats[chatId];
      saveChats();
      
      if (currentChatId === chatId) {
        const remainingChats = getSortedChats();
        currentChatId = remainingChats[0].id;
        displayChat(currentChatId);
      }
      
      updateChatHistoryUI();
    }
  }

  // Message Handling
  function sendMessage() {
    const message = messageInput.value.trim();
    if (!message && !fileInput.files.length) return;
    
    const timestamp = new Date().toISOString();
    let fileData = null;
    
    // Handle file attachment if exists
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file)
      };
      
      // Reset file input
      fileInput.value = '';
      messageInput.placeholder = "សរសេរសាររបស់អ្នកនៅទីនេះ...";
    }
    
    // Add message to UI
    addMessageToUI(message, 'user', timestamp, fileData);
    
    // Update current chat
    chats[currentChatId].messages.push({
      role: 'user',
      text: message,
      timestamp,
      file: fileData
    });
    
    // Update chat title if first message
    if (chats[currentChatId].messages.length === 1) {
      chats[currentChatId].title = message || "ឯកសារភ្ជាប់";
      updateChatHistoryUI();
    }
    
    // Update timestamps
    chats[currentChatId].updatedAt = timestamp;
    
    conversationHistory.push({ 
      role: 'user', 
      content: message,
      file: fileData
    });
    saveChats();
    
    // Clear input and get AI response
    messageInput.value = '';
    messageInput.style.height = 'auto';
    showTypingIndicator();
    lastUserMessage = message;
    fetchAIResponse(message);
  }

  async function fetchAIResponse(userMessage) {
    if (isAIResponding) return;
    isAIResponding = true;
    
    const timestamp = new Date().toISOString();
    const tempMessageId = 'temp-' + Date.now();
    
    // Create temporary message container
    const tempMessageDiv = document.createElement('div');
    tempMessageDiv.id = tempMessageId;
    tempMessageDiv.className = 'message ai-message';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content typing-animation';
    messageContent.textContent = '|'; // Initial cursor
    
    const messageMeta = document.createElement('div');
    messageMeta.className = 'message-meta';
    
    const senderElement = document.createElement('span');
    senderElement.className = 'sender';
    senderElement.textContent = 'Synh AI';
    
    const timeElement = document.createElement('span');
    timeElement.className = 'timestamp';
    timeElement.textContent = formatTime(new Date(timestamp));
    
    messageMeta.append(senderElement, ' • ', timeElement);
    tempMessageDiv.append(messageContent, messageMeta);
    
    // Remove welcome message if it exists
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
      welcomeMessage.remove();
    }
    
    chatWindow.appendChild(tempMessageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: conversationHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Synh AI error: ${response.status}`);
      }

      const data = await response.json();
      let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                      "ខ្ញុំមិនអាចឆ្លើយសំណួរនេះបានទេ។";
      
      // Customize response for your brand
      aiResponse = aiResponse.replace(/Google|Gemini/g, 'Synh AI');

      // Simulate typing effect
      await simulateTypingEffect(tempMessageId, aiResponse, timestamp);

    } catch (error) {
      console.error("API Error:", error);
      document.getElementById(tempMessageId)?.remove();
      addMessageToUI("⚠️ មានបញ្ហាក្នុងការភ្ជាប់ទៅកាន់ Synh AI. សូមព្យាយាមម្តងទៀត!", 'ai', new Date().toISOString());
    } finally {
      isAIResponding = false;
      clearInterval(typingAnimationInterval);
      typingIndicator.style.display = 'none'; // Ensure typing indicator is hidden
    }
  }

  async function simulateTypingEffect(elementId, fullText, timestamp) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const messageContent = element.querySelector('.message-content');
    messageContent.classList.add('typing-animation');
    
    let currentPosition = 0;
    const typingSpeed = 20 + Math.random() * 30; // Vary speed for natural feel
    currentTypingMessage = "";
    
    return new Promise(resolve => {
      typingAnimationInterval = setInterval(() => {
        if (currentPosition >= fullText.length) {
          clearInterval(typingAnimationInterval);
          messageContent.classList.remove('typing-animation');
          
          // Replace with final message
          setTimeout(() => {
            element.remove();
            addMessageToUI(fullText, 'ai', timestamp);
            resolve();
          }, 500);
          
          return;
        }
        
        // Add next character with occasional pauses
        if (Math.random() > 0.1 || currentPosition === 0) {
          currentTypingMessage += fullText[currentPosition];
          currentPosition++;
          
          // Update content with cursor
          messageContent.innerHTML = currentTypingMessage.replace(/\n/g, '<br>') + '<span class="typing-cursor">▍</span>';
          
          // Auto-scroll
          chatWindow.scrollTop = chatWindow.scrollHeight;
        }
      }, typingSpeed);
    });
  }

  function addMessageToUI(content, sender, timestamp, file = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = sender === 'user' ? 'translateX(20px)' : 'translateX(-20px)';
    messageDiv.style.animation = `${sender === 'user' ? 'fadeInRight' : 'fadeInLeft'} 0.3s forwards`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = content.replace(/\n/g, '<br>');
    
    // Add file attachment if exists
    if (file) {
      const fileExt = file.name.split('.').pop().toLowerCase();
      const fileType = file.type.split('/')[0];
      
      let fileIcon = 'fa-file';
      if (fileType === 'image') fileIcon = 'fa-image';
      else if (file.type.includes('pdf')) fileIcon = 'fa-file-pdf';
      else if (file.type.includes('word')) fileIcon = 'fa-file-word';
      else if (file.type.includes('text')) fileIcon = 'fa-file-alt';
      
      const fileSize = formatFileSize(file.size);
      
      if (fileType === 'image') {
        // Show image preview with loading animation
        const imgContainer = document.createElement('div');
        imgContainer.className = 'image-loading';
        
        const imgPreview = document.createElement('img');
        imgPreview.src = file.url;
        imgPreview.className = 'image-preview';
        imgPreview.alt = file.name;
        imgPreview.onload = () => {
          imgContainer.classList.remove('image-loading');
        };
        
        imgContainer.appendChild(imgPreview);
        messageContent.appendChild(imgContainer);
      } else {
        // Show file attachment
        const fileLink = document.createElement('a');
        fileLink.href = file.url;
        fileLink.className = 'file-attachment';
        fileLink.target = '_blank';
        fileLink.innerHTML = `
          <i class="fas ${fileIcon} file-icon"></i>
          <span>${file.name} (${fileSize})</span>
        `;
        messageContent.appendChild(fileLink);
      }
    }
    
    const messageMeta = document.createElement('div');
    messageMeta.className = 'message-meta';
    
    const timeElement = document.createElement('span');
    timeElement.className = 'timestamp';
    timeElement.textContent = formatTime(new Date(timestamp));
    
    if (sender === 'ai') {
      const senderElement = document.createElement('span');
      senderElement.className = 'sender';
      senderElement.textContent = 'Synh AI';
      messageMeta.append(senderElement, ' • ', timeElement);
      
      // Add action buttons for AI messages
      const actionButtons = document.createElement('div');
      actionButtons.className = 'message-actions';
      
      // Copy button
      const copyButton = document.createElement('button');
      copyButton.className = 'action-btn copy-btn';
      copyButton.innerHTML = '<i class="far fa-copy"></i>';
      copyButton.title = 'Copy message';
      copyButton.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(content);
        showTooltip(copyButton, 'Copied!');
      });
      
      // Like button
      const likeButton = document.createElement('button');
      likeButton.className = 'action-btn like-btn';
      likeButton.innerHTML = '<i class="far fa-thumbs-up"></i>';
      likeButton.title = 'Like this response';
      likeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        likeButton.innerHTML = '<i class="fas fa-thumbs-up"></i>';
        likeButton.classList.add('liked');
        showTooltip(likeButton, 'Liked!');
      });
      
      // Regenerate button
      const regenerateButton = document.createElement('button');
      regenerateButton.className = 'action-btn regenerate-btn';
      regenerateButton.innerHTML = '<i class="fas fa-redo"></i>';
      regenerateButton.title = 'Regenerate response';
      regenerateButton.addEventListener('click', (e) => {
        e.stopPropagation();
        regenerateResponse(messageDiv);
      });
      
      actionButtons.append(copyButton, likeButton, regenerateButton);
      messageMeta.appendChild(actionButtons);
    } else {
      messageMeta.appendChild(timeElement);
    }
    
    messageDiv.append(messageContent, messageMeta);
    
    // Remove welcome message if it's the first user message
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage && sender === 'user') {
      welcomeMessage.remove();
    }
    
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    // Add to conversation history if not already there (typing messages are added after completion)
    if (sender === 'user' || !isAIResponding) {
      const messageData = {
        role: sender,
        text: content,
        timestamp,
        ...(file && { file })
      };
      
      if (sender === 'user') {
        chats[currentChatId].messages.push(messageData);
      } else {
        chats[currentChatId].messages.push(messageData);
        conversationHistory.push({
          role: 'model',
          content: content
        });
      }
      
      saveChats();
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

  function showTooltip(button, message) {
    const tooltip = document.createElement('span');
    tooltip.className = 'tooltip';
    tooltip.textContent = message;
    button.appendChild(tooltip);
    
    setTimeout(() => {
      tooltip.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      tooltip.classList.remove('show');
      setTimeout(() => {
        button.removeChild(tooltip);
      }, 300);
    }, 2000);
  }

  function regenerateResponse(messageElement) {
    if (isAIResponding) return;
    
    // Remove the existing message
    messageElement.remove();
    
    // Remove from chat history
    const messageIndex = chats[currentChatId].messages.findIndex(
      msg => msg.role === 'model' && msg.text === messageElement.querySelector('.message-content').textContent
    );
    
    if (messageIndex !== -1) {
      chats[currentChatId].messages.splice(messageIndex, 1);
      conversationHistory.pop(); // Remove last AI response
      saveChats();
    }
    
    // Resend the last user message
    showTypingIndicator();
    fetchAIResponse(lastUserMessage);
  }

  // UI Functions
  function updateActiveChatIndicator() {
    document.querySelectorAll('.chat-item').forEach(item => {
      item.classList.toggle('active', item.dataset.chatId === currentChatId);
    });
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

  // Sidebar Functions
  function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    sidebar.classList.toggle('visible', isSidebarOpen);
    sidebarOverlay.classList.toggle('visible', isSidebarOpen);
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
  }

  function closeSidebarFn() {
    isSidebarOpen = false;
    sidebar.classList.remove('visible');
    sidebarOverlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  // Helper Functions
  function generateChatId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  function formatTime(date) {
    return date.toLocaleTimeString('km-KH', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return formatTime(date);
    } else if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('km-KH', { 
        month: 'short', 
        day: 'numeric' 
      });
    } else {
      return date.toLocaleDateString('km-KH', { 
        year: 'numeric',
        month: 'short', 
        day: 'numeric' 
      });
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Event Listeners
  menuToggle.addEventListener('click', toggleSidebar);
  closeSidebar.addEventListener('click', closeSidebarFn);
  sidebarOverlay.addEventListener('click', closeSidebarFn);
  
  messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });
  
  messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  sendButton.addEventListener('click', sendMessage);
  newChatBtn.addEventListener('click', createNewChat);
  attachmentButton.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
      const fileName = this.files[0].name;
      messageInput.placeholder = `ឯកសារ: ${fileName} - សរសេរសារ (ជាជម្រើស)...`;
    }
  });
  
  // Initial focus
  messageInput.focus();
  
  // Responsive handling
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && isSidebarOpen) {
      closeSidebarFn();
    }
  });

  // Add the required CSS styles
  const style = document.createElement('style');
  style.textContent = `
    /* Typing animations */
    @keyframes fadeInLeft {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes fadeInRight {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .typing-animation {
      position: relative;
    }

    .typing-cursor {
      display: inline-block;
      animation: blink 1s infinite;
      vertical-align: baseline;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    /* Image loading */
    .image-loading {
      position: relative;
      background: #f3f4f6;
      border-radius: 12px;
      overflow: hidden;
      min-height: 100px;
    }

    .image-loading::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, 
        rgba(255,255,255,0) 0%, 
        rgba(255,255,255,0.8) 50%, 
        rgba(255,255,255,0) 100%);
      animation: loadingShimmer 1.5s infinite;
    }

    @keyframes loadingShimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    /* Message animations */
    .message {
      transition: all 0.3s ease;
    }

    .message.user-message {
      animation: fadeInRight 0.3s forwards;
    }

    .message.ai-message {
      animation: fadeInLeft 0.3s forwards;
    }

    /* Message action buttons */
    .message-actions {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }
    
    .action-btn {
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      position: relative;
    }
    
    .action-btn:hover {
      background: #f3f4f6;
      color: #1f2937;
    }
    
    .action-btn.liked {
      color: #2563eb;
    }
    
    .ai-message .message-meta {
      display: flex;
      align-items: center;
    }
    
    /* Tooltip styles */
    .tooltip {
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      background: #1f2937;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }
    
    .tooltip.show {
      opacity: 1;
    }
    
    /* Typing indicator fix */
    .typing-indicator {
      transition: opacity 0.3s ease;
    }
  `;
  document.head.appendChild(style);
});
