
document.addEventListener('DOMContentLoaded', function() {
  
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
  const blurBackground = document.getElementById('blur-background');
  const feedbackModal = document.getElementById('feedback-modal');
  const feedbackTextarea = document.getElementById('feedback-textarea');
  const feedbackCancel = document.getElementById('feedback-cancel');
  const feedbackSubmit = document.getElementById('feedback-submit');

  
  const API_KEY = "AIzaSyB5A8BsOXhnPYO9sw3cNJscHthmZl9nGRs";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  
  let isSidebarOpen = false;
  let currentChatId = null;
  let chats = {};
  let conversationHistory = [];
  let isAIResponding = false;
  let typingAnimationInterval;
  let currentTypingMessage = "";
  let lastUserMessage = null;
  let selectedMessage = null;

  
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
    
    
    setTimeout(() => {
      inputArea.classList.add('visible');
    }, 300);
  }

  
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
    
    
    chatWindow.innerHTML = chat.messages.length === 0 ? 
      `<div class="welcome-message">
        <h2>${chatId === currentChatId ? 'ការជជែកថ្មី' : 'ការជជែកមុន'}</h2>
        <p>${chatId === currentChatId ? 'ខ្ញុំអាចជួយអ្នកដោះស្រាយបញ្ហា ឆ្លើយសំណួរ និងផ្តល់យោបល់ដល់អ្នក។' : 'ការជជែកពីមុន។'}</p>
      </div>` : '';
    
    
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

  
  function sendMessage() {
    const message = messageInput.value.trim();
    if ((!message && !fileInput.files.length) || isAIResponding) return;
    
    const timestamp = new Date().toISOString();
    let fileData = null;
    
    
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file)
      };
      
      
      fileInput.value = '';
      messageInput.placeholder = "សរសេរសាររបស់អ្នកនៅទីនេះ...";
    }
    
    
    addMessageToUI(message, 'user', timestamp, fileData);
    
    
    chats[currentChatId].messages.push({
      role: 'user',
      text: message,
      timestamp,
      file: fileData
    });
    
    
    if (chats[currentChatId].messages.length === 1) {
      let title = message || "ឯកសារភ្ជាប់";
      if (title.length > 30) {
        title = title.substring(0, 30) + "...";
      }
      chats[currentChatId].title = title;
      updateChatHistoryUI();
    }
    
   
    chats[currentChatId].updatedAt = timestamp;
    
    conversationHistory.push({ 
      role: 'user', 
      content: message,
      file: fileData
    });
    saveChats();
    
   
    messageInput.value = '';
    messageInput.style.height = 'auto';
    showTypingIndicator();
    lastUserMessage = message;
    fetchAIResponse(message);
  }

  async function fetchAIResponse(userMessage) {
    if (isAIResponding) return;
    isAIResponding = true;
    sendButton.disabled = true;
    
    const timestamp = new Date().toISOString();
    const tempMessageId = 'temp-' + Date.now();
    
   
    const tempMessageDiv = document.createElement('div');
    tempMessageDiv.id = tempMessageId;
    tempMessageDiv.className = 'message ai-message';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content typing-animation';
    messageContent.textContent = '|';
    
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
      
      aiResponse = aiResponse.replace(/Google|Gemini/g, 'Synh AI');

          await simulateTypingEffect(tempMessageId, aiResponse, timestamp);

   
      chats[currentChatId].messages.push({
        role: 'ai',
        text: aiResponse,
        timestamp: new Date().toISOString()
      });
      saveChats();

    } catch (error) {
      console.error("AI Error:", error);
      document.getElementById(tempMessageId)?.remove();
      addMessageToUI("⚠️ មានបញ្ហាក្នុងការភ្ជាប់ទៅកាន់ Synh AI. សូមព្យាយាមម្តងទៀត!", 'ai', new Date().toISOString());
    } finally {
      isAIResponding = false;
      clearInterval(typingAnimationInterval);
      typingIndicator.style.display = 'none';
      sendButton.disabled = false;
    }
  }

  async function simulateTypingEffect(elementId, fullText, timestamp) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const messageContent = element.querySelector('.message-content');
    messageContent.classList.add('typing-animation');
    
    let currentPosition = 0;
    const typingSpeed = 20 + Math.random() * 30;
    currentTypingMessage = "";
    
    return new Promise(resolve => {
      typingAnimationInterval = setInterval(() => {
        if (currentPosition >= fullText.length) {
          clearInterval(typingAnimationInterval);
          messageContent.classList.remove('typing-animation');
          
          setTimeout(() => {
            element.remove();
            addMessageToUI(fullText, 'ai', timestamp);
            resolve();
          }, 500);
          
          return;
        }
        
        if (Math.random() > 0.1 || currentPosition === 0) {
          currentTypingMessage += fullText[currentPosition];
          currentPosition++;
          
          messageContent.innerHTML = currentTypingMessage.replace(/\n/g, '<br>') + '<span class="typing-cursor">▍</span>';
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
      
      const actionButtons = document.createElement('div');
      actionButtons.className = 'message-actions';
      
      const copyButton = document.createElement('button');
      copyButton.className = 'action-btn copy-btn';
      copyButton.innerHTML = '<i class="far fa-copy"></i>';
      copyButton.title = 'Copy message';
      copyButton.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(content);
        showTooltip(copyButton, 'Copied!');
      });
      
      const likeButton = document.createElement('button');
      likeButton.className = 'action-btn like-btn';
      likeButton.innerHTML = '<i class="far fa-thumbs-up"></i>';
      likeButton.title = 'Like this response';
      likeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        likeButton.innerHTML = '<i class="fas fa-thumbs-up"></i>';
        likeButton.classList.add('liked');
        showTooltip(likeButton, 'Liked!');
        
        const dislikeButton = e.currentTarget.parentElement.querySelector('.dislike-btn');
        if (dislikeButton) {
          dislikeButton.innerHTML = '<i class="far fa-thumbs-down"></i>';
          dislikeButton.classList.remove('disliked');
        }
      });
      
      const dislikeButton = document.createElement('button');
      dislikeButton.className = 'action-btn dislike-btn';
      dislikeButton.innerHTML = '<i class="far fa-thumbs-down"></i>';
      dislikeButton.title = 'Dislike this response';
      dislikeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dislikeButton.innerHTML = '<i class="fas fa-thumbs-down"></i>';
        dislikeButton.classList.add('disliked');
        showTooltip(dislikeButton, 'Disliked!');
        
        const likeButton = e.currentTarget.parentElement.querySelector('.like-btn');
        if (likeButton) {
          likeButton.innerHTML = '<i class="far fa-thumbs-up"></i>';
          likeButton.classList.remove('liked');
        }
        
        showFeedbackModal(messageDiv);
      });
      
      const regenerateButton = document.createElement('button');
      regenerateButton.className = 'action-btn regenerate-btn';
      regenerateButton.innerHTML = '<i class="fas fa-redo"></i>';
      regenerateButton.title = 'Regenerate response';
      regenerateButton.addEventListener('click', (e) => {
        e.stopPropagation();
        regenerateResponse(messageDiv);
      });
      
      actionButtons.append(copyButton, likeButton, dislikeButton, regenerateButton);
      messageMeta.appendChild(actionButtons);
    } else {
      messageMeta.appendChild(timeElement);
    }
    
    messageDiv.append(messageContent, messageMeta);
    
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage && sender === 'user') {
      welcomeMessage.remove();
    }
    
    let pressTimer;
    messageDiv.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      pressTimer = setTimeout(() => {
        selectMessage(messageDiv);
      }, 500);
    });
    
    messageDiv.addEventListener('mouseup', function() {
      clearTimeout(pressTimer);
    });
    
    messageDiv.addEventListener('mouseleave', function() {
      clearTimeout(pressTimer);
    });
    
    messageDiv.addEventListener('click', function(e) {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'I' || e.target.tagName === 'A') {
        return;
      }
      clearTimeout(pressTimer);
      if (selectedMessage === messageDiv) {
        deselectMessage();
      }
    });
    
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function selectMessage(messageDiv) {
    deselectMessage();
    selectedMessage = messageDiv;
    messageDiv.classList.add('selected');
    blurBackground.style.display = 'block';
    
    blurBackground.addEventListener('click', deselectMessage);
  }
  
  function deselectMessage() {
    if (selectedMessage) {
      selectedMessage.classList.remove('selected');
      selectedMessage = null;
    }
    blurBackground.style.display = 'none';
  }
  
  function showFeedbackModal(messageDiv) {
    feedbackModal.style.display = 'block';
    blurBackground.style.display = 'block';
    feedbackModal.dataset.messageId = Array.from(chatWindow.children).indexOf(messageDiv);
  }
  
  function hideFeedbackModal() {
    feedbackModal.style.display = 'none';
    blurBackground.style.display = 'none';
    feedbackTextarea.value = '';
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
    
    messageElement.remove();
    
    const messageIndex = chats[currentChatId].messages.findIndex(
      msg => msg.role === 'model' && msg.text === messageElement.querySelector('.message-content').textContent
    );
    
    if (messageIndex !== -1) {
      chats[currentChatId].messages.splice(messageIndex, 1);
      conversationHistory.pop();
      saveChats();
    }
    
    showTypingIndicator();
    fetchAIResponse(lastUserMessage);
  }

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
  
  sendButton.addEventListener('click', function(e) {
    e.preventDefault();
    sendMessage();
  });
  
  newChatBtn.addEventListener('click', createNewChat);
  attachmentButton.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
      const fileName = this.files[0].name;
      messageInput.placeholder = `ឯកសារ: ${fileName} - សរសេរសារ (ជាជម្រើស)...`;
    }
  });
  
  featureCards.forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      messageInput.value = prompt;
      messageInput.focus();
    });
  });
  
  feedbackCancel.addEventListener('click', hideFeedbackModal);
  feedbackSubmit.addEventListener('click', function() {
    const feedback = feedbackTextarea.value.trim();
    const messageIndex = feedbackModal.dataset.messageId;
    
    if (feedback) {
      console.log('User feedback:', feedback);
      alert('សូមអរគុណសម្រាប់មតិយោបល់របស់អ្នក!');
    }
    
    hideFeedbackModal();
  });
  
  messageInput.focus();
  
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && isSidebarOpen) {
      closeSidebarFn();
    }
  });
});
