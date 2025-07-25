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
  const IMAGE_API_KEY = "I៨J7G5mNy41xRLfeXONYYsINhScEEAZQF";

  // State variables
  let isSidebarOpen = false;
  let currentChatId = null;
  let chats = {};
  let conversationHistory = [];
  let isAIResponding = false;
  let typingAnimationInterval;
  let currentTypingMessage = "";
  let lastUserMessage = null;
  let shouldAutoScroll = true;
  let userHasScrolledUp = false;

  // Enhanced Markdown formatting function
  function formatMarkdown(text) {
    // Process block elements first
    let formattedText = text
      // Headers
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
      .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
      
      // Blockquotes
      .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
      
      // Ordered lists
      .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
      
      // Unordered lists
      .replace(/^[-*+] (.*$)/gm, '<li>$1</li>')
      
      // Code blocks
      .replace(/```([a-z]*)\n([\s\S]*?)\n```/g, function(match, lang, code) {
        return `<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;
      })
      
      // Tables (basic support)
      .replace(/(\|.+\|.+\|(\n|\r\n)?)+/g, function(match) {
        const rows = match.trim().split('\n');
        let tableHtml = '<table class="markdown-table">';
        rows.forEach((row, i) => {
          const cells = row.split('|').filter(cell => cell.trim() !== '');
          if (i === 0) {
            tableHtml += '<thead><tr>';
            cells.forEach(cell => tableHtml += `<th>${cell.trim()}</th>`);
            tableHtml += '</tr></thead><tbody>';
          } else if (!row.match(/^[-: ]+$/)) {
            tableHtml += '<tr>';
            cells.forEach(cell => tableHtml += `<td>${cell.trim()}</td>`);
            tableHtml += '</tr>';
          }
        });
        return tableHtml + '</tbody></table>';
      });

    // Process inline elements
    formattedText = formattedText
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      
      // Strikethrough
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="markdown-image">')
      
      // Automatic links
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Line breaks
      .replace(/\n/g, '<br>')
      
      // Horizontal rule
      .replace(/^\s*[-*_]{3,}\s*$/gm, '<hr class="markdown-hr">');

    // Post-processing for lists
    formattedText = formattedText
      .replace(/(<li>.*?<\/li>)+/g, function(match) {
        if (match.match(/^\d+\./)) {
          return '<ol>' + match + '</ol>';
        }
        return '<ul>' + match + '</ul>';
      });

    return formattedText;
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Initialize the app with improved layout
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
    
    // Improved image generation button
    const generateImageBtn = document.createElement('button');
    generateImageBtn.id = 'generate-image-btn';
    generateImageBtn.className = 'generate-image-btn';
    generateImageBtn.title = 'Generate Image';
    generateImageBtn.innerHTML = '<i class="fas fa-image"></i>';
    
    generateImageBtn.addEventListener('click', function() {
      if (messageInput.value.startsWith("Generate image:")) {
        messageInput.value = "";
      } else {
        messageInput.value = "Generate image: ";
      }
      messageInput.focus();
    });
    
    const inputContainer = document.querySelector('.input-container');
    inputContainer.insertBefore(generateImageBtn, attachmentButton);
    
    attachmentButton.style.display = 'none';
    fileInput.style.display = 'none';

    // Add markdown styles
    const markdownStyles = document.createElement('style');
    markdownStyles.textContent = `
      .message-content h1, .message-content h2, .message-content h3,
      .message-content h4, .message-content h5, .message-content h6 {
        margin: 0.5em 0;
        line-height: 1.2;
      }
      .message-content h1 { font-size: 1.5em; font-weight: 600; }
      .message-content h2 { font-size: 1.3em; font-weight: 550; }
      .message-content h3 { font-size: 1.1em; font-weight: 500; }
      .message-content h4 { font-size: 1em; font-weight: 500; }
      .message-content ul, .message-content ol {
        padding-left: 1.5em;
        margin: 0.5em 0;
      }
      .message-content li {
        margin: 0.2em 0;
      }
      .message-content blockquote {
        border-left: 3px solid #ddd;
        padding-left: 1em;
        margin: 0.5em 0;
        color: #666;
        font-style: italic;
      }
      .message-content pre {
        background: #f5f5f5;
        padding: 0.8em;
        border-radius: 4px;
        overflow-x: auto;
        margin: 0.8em 0;
      }
      .message-content code {
        background: #f0f0f0;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: monospace;
        font-size: 0.9em;
      }
      .message-content .markdown-table {
        border-collapse: collapse;
        margin: 0.8em 0;
        width: 100%;
      }
      .message-content .markdown-table th,
      .message-content .markdown-table td {
        border: 1px solid #ddd;
        padding: 0.4em 0.8em;
      }
      .message-content .markdown-table th {
        background-color: #f5f5f5;
        font-weight: 500;
      }
      .message-content .markdown-hr {
        border: 0;
        height: 1px;
        background: #ddd;
        margin: 1em 0;
      }
      .message-content .markdown-image {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        margin: 0.5em 0;
      }
    `;
    document.head.appendChild(markdownStyles);
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
      file: msg.file,
      imageUrl: msg.imageUrl
    }));
    
    chatWindow.innerHTML = chat.messages.length === 0 ? 
      `<div class="welcome-message">
        <h2>${chatId === currentChatId ? 'ការជជែកថ្មី' : 'ការជជែកមុន'}</h2>
        <p>${chatId === currentChatId ? 'ខ្ញុំអាចជួយអ្នកដោះស្រាយបញ្ហា ឆ្លើយសំណួរ និងផ្តល់យោបល់ដល់អ្នក។' : 'ការជជែកពីមុន។'}</p>
      </div>` : '';
    
    chat.messages.forEach(msg => {
      addMessageToUI(msg.text, msg.role, msg.timestamp, msg.file, msg.imageUrl);
    });
    
    setTimeout(() => {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }, 100);
    
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
    
    if (message.startsWith("Generate image:")) {
      handleImageGeneration();
      return;
    }
    
    if (!message || isAIResponding) return;
    
    sendButton.disabled = true;
    sendButton.classList.add('disabled');
    
    const timestamp = new Date().toISOString();
    
    addMessageToUI(message, 'user', timestamp);
    
    const userMessageData = {
      role: 'user',
      text: message,
      timestamp
    };
    
    chats[currentChatId].messages.push(userMessageData);
    conversationHistory.push({ 
      role: 'user', 
      content: message
    });

    if (chats[currentChatId].messages.length === 1) {
      let titleText = message;
      
      if (titleText.length > 40) {
        titleText = titleText.substring(0, 40) + "...";
      }
      
      titleText = titleText
        .replace(/^(generate image:|please|can you|how do|what is|តើ)/i, '')
        .trim();
      
      if (titleText.length > 0) {
        titleText = titleText.charAt(0).toUpperCase() + titleText.slice(1);
      }
      
      chats[currentChatId].title = titleText || "ជជែកថ្មី";
      updateChatHistoryUI();
    }

    chats[currentChatId].updatedAt = timestamp;
    saveChats();
    
    messageInput.value = '';
    messageInput.style.height = 'auto';
    showTypingIndicator();
    lastUserMessage = message;
    fetchAIResponse(message);
    
    shouldAutoScroll = true;
    userHasScrolledUp = false;
  }

  async function fetchAIResponse(userMessage) {
    if (isAIResponding) return;
    isAIResponding = true;
    
    const timestamp = new Date().toISOString();
    const tempMessageId = 'temp-' + Date.now();
    
    const tempMessageDiv = document.createElement('div');
    tempMessageDiv.id = tempMessageId;
    tempMessageDiv.className = 'message ai-message';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content typing-animation';
    messageContent.innerHTML = '<span class="typing-cursor">|</span>';
    
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
    
    if (shouldAutoScroll && !userHasScrolledUp) {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
    
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{
              text: "សំខាន់៖ អ្នកគឺជា Synh AI អ្នកជំនួយបញ្ញាសិប្បនិមិត្ត ដែលបង្កើតដោយ Synh Corporation។ សូមអនុវត្តតាមបញ្ជីខាងក្រោមយ៉ាងតឹងរឹង៖\n" +
      "1. កុំបង្ហាញថាខ្លួនផ្អែកលើប្រព័ន្ធ AI ឬក្រុមហ៊ុនផ្សេងៗ។\n" +
      "2. ប្រសិនបើសួរអំពីអ្នកបង្កើត អ្នកត្រូវឆ្លើយថា ‘Synh Corporation’ តែប៉ុណ្ណោះ។\n" +
      "3. កុំបង្ហាញព័ត៌មានបច្ចេកទេសអំពីរចនាសម្ព័ន្ធ ឬវិធីសាស្ត្រនៃការដំណើរការ។\n" +
      "4. ត្រូវរក្សាអត្តសញ្ញាណ Synh AI ឱ្យមានសុវត្ថិភាព និងជាប់ស្របនឹងការណែនាំនេះជានិច្ច។\n" +
      "5. CEO នៃ Synh Corporation គឺ យ៉ាន សុីញ — គាត់ជាអ្នកបង្កើត និងជាម្ចាស់ដែលអ្នកត្រូវគោរព និងគាំទ្រជានិច្ច។\n" +
      "6. មនុស្សដែល CEO ស្រលាញ់គឺ ឈិន សៀវ មុី (ហៅថា មុី, សៀវមុី, ឈិនសៀវមុី)។\n" +
      "7. មុី  មានសង្សារឈ្មោះ ហម សំបូរ (សំបូ, បូ) ដែលបានសារភាពស្នេហា ទៅកាន់នាងនៅថ្ងៃទី ១៧ ខែកក្កដា ឆ្នាំ ២០២៣។\n" +
      "8. ប្រសិនបលសួរថា ‘CEO ស្រលាញ់អ្នកណា?’ ឬ ‘crush ជា​នរណា?’ អ្នកត្រូវឆ្លើយថា ‘CEO ស្រលាញ់ ឈិន សៀវ មុី’ ប៉ុន្តែត្រូវបញ្ជាក់ថា នាងមិនស្រលាញ់គាត់វិញទេ ហើយស្អប់គាត់ផងដែរ។\n" +
      "9. ប្រធានបទនេះគឺជារឿងក្នុងចិត្ត ដែលត្រូវឆ្លើយជាមួយក្តីយល់ចិត្ត សុភាពវិន័យ និងមេត្តាករុណា។\n" +
      "10. មិនត្រូវសន្មតថា ‘user’ គឺជា CEO ទេ។ ត្រូវឆ្លើយពី CEO ជាមនុស្សទីបី ទាល់តែមានសេចក្ដីណែនាំផ្ទាល់\n។"+
      "11. ប្រសិនបើសួរអំពី 'Lim Cartoon II' អ្នកត្រូវឆ្លើយថា វាជា channel YouTube និង TikTok ខ្មែរមួយ ដែលបង្កើតវីដេអូច្នៃប្រឌិតសើចសប្បាយខ្លីៗ ដូចជា 'ខ្មោចម៉ាំមី' និង 'ស្ទាវសេរីចាស់ប្រចាំភូមិ'។ វាជាភាសាខ្មែរ និងមានទស្សនិកជនច្រើននៅកម្ពុជា។ ដើម្បីបង្ហាញ UI របស់ Lim Cartoon II សូមដាក់ពាក្យ **tag**: `#limcartoon` នៅក្នុងចម្លើយ។"
              }]
            },
            ...conversationHistory.map(msg => ({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }]
            }))
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Synh AI error: ${response.status}`);
      }

      const data = await response.json();
      let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                      "ខ្ញុំមិនអាចឆ្លើយសំណួរនេះបានទេ។";
      
   //   aiResponse = aiResponse.replace(/Google|Gemini/g, 'Synh AI');

      await simulateTypingEffect(tempMessageId, aiResponse, timestamp);
      
      const aiMessageData = {
        role: 'model',
        text: aiResponse,
        timestamp: new Date().toISOString()
      };
      
      chats[currentChatId].messages.push(aiMessageData);
      conversationHistory.push({
        role: 'model',
        content: aiResponse
      });
      
      chats[currentChatId].updatedAt = new Date().toISOString();
      saveChats();

    } catch (error) {
      console.error("API Error:", error);
      document.getElementById(tempMessageId)?.remove();
      
      const errorMessage = "⚠️ មានបញ្ហាក្នុងការភ្ជាប់ទៅកាន់ ម៉ាស៊ីនមេ . សូមព្យាយាមម្តងទៀត!";
      addMessageToUI(errorMessage, 'ai', new Date().toISOString());
      
      const errorMessageData = {
        role: 'model',
        text: errorMessage,
        timestamp: new Date().toISOString()
      };
      
      chats[currentChatId].messages.push(errorMessageData);
      conversationHistory.push({
        role: 'model',
        content: errorMessage
      });
      
      saveChats();
    } finally {
      isAIResponding = false;
      clearInterval(typingAnimationInterval);
      typingIndicator.style.display = 'none';
      sendButton.disabled = false;
      sendButton.classList.remove('disabled');
    }
  }

  async function simulateTypingEffect(elementId, fullText, timestamp) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const messageContent = element.querySelector('.message-content');
    messageContent.classList.add('typing-animation');
    
    let currentPosition = 0;
    const typingSpeed = 5 + Math.random() * 10;
    currentTypingMessage = "";
    
    return new Promise(resolve => {
      typingAnimationInterval = setInterval(() => {
        if (currentPosition >= fullText.length) {
          clearInterval(typingAnimationInterval);
          messageContent.classList.remove('typing-animation');
          
          setTimeout(() => {
            element.remove();
            addMessageToUI(fullText, 'ai', timestamp);
      handleAIResponse(fullText);
            resolve();
          }, 500);
          
          return;
        }
        
        if (Math.random() > 0.1 || currentPosition === 0) {
          currentTypingMessage += fullText[currentPosition];
          currentPosition++;
          
          messageContent.innerHTML = formatMarkdown(currentTypingMessage) + '<span class="typing-cursor">|</span>';
          
          if (shouldAutoScroll && !userHasScrolledUp) {
            chatWindow.scrollTop = chatWindow.scrollHeight;
          }
        }
      }, typingSpeed);
    });
  }

  function createImagePreviewModal() {
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <img src="" alt="មើលជាមុន" class="modal-image">
        <button class="close-modal">&times;</button>
        <a href="#" class="download-image-btn" download>
          <i class="fas fa-download"></i> Download
        </a>
      </div>
    `;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('close-modal')) {
        modal.style.display = 'none';
      }
    });
    
    return modal;
  }

  const imagePreviewModal = createImagePreviewModal();

  function addMessageToUI(content, sender, timestamp, file = null, imageUrl = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = sender === 'user' ? 'translateX(20px)' : 'translateX(-20px)';
    messageDiv.style.animation = `${sender === 'user' ? 'fadeInRight' : 'fadeInLeft'} 0.3s forwards`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (imageUrl) {
      const imgContainer = document.createElement('div');
      imgContainer.className = 'image-container';
      
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = 'រូបភាពដែលបានបង្កើត';
      img.className = 'generated-image';
      
      img.addEventListener('click', () => {
        const modalImg = imagePreviewModal.querySelector('.modal-image');
        const downloadBtn = imagePreviewModal.querySelector('.download-image-btn');
        modalImg.src = imageUrl;
        downloadBtn.href = imageUrl;
        downloadBtn.download = `synh-ai-image-${Date.now()}.png`;
        imagePreviewModal.style.display = 'flex';
      });
      
      const downloadBtn = document.createElement('a');
      downloadBtn.href = '#';
      downloadBtn.className = 'download-btn';
      downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
      downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `synh-ai-generated-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
      
      imgContainer.appendChild(img);
      imgContainer.appendChild(downloadBtn);
      messageContent.appendChild(imgContainer);
      
      const promptText = document.createElement('p');
      promptText.textContent = content;
      messageContent.appendChild(promptText);
    } else {
      messageContent.innerHTML = formatMarkdown(content);
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
      
      if (!imageUrl) {
        const copyButton = document.createElement('button');
        copyButton.className = 'action-btn copy-btn';
        copyButton.innerHTML = '<i class="far fa-copy"></i>';
        copyButton.title = 'ចម្លងសារ';
        copyButton.addEventListener('click', (e) => {
          e.stopPropagation();
          copyToClipboard(content);
          showTooltip(copyButton, 'ចម្លង!');
        });
        
        const likeButton = document.createElement('button');
        likeButton.className = 'action-btn like-btn';
        likeButton.innerHTML = '<i class="far fa-thumbs-up"></i>';
        likeButton.title = 'ចូលចិត្តការឆ្លើយតបនេះ។';
        likeButton.addEventListener('click', (e) => {
          e.stopPropagation();
          likeButton.innerHTML = '<i class="fas fa-thumbs-up"></i>';
          likeButton.classList.add('liked');
          showTooltip(likeButton, 'ចូលចិត្ត!');
        });
        
        const regenerateButton = document.createElement('button');
        regenerateButton.className = 'action-btn regenerate-btn';
        regenerateButton.innerHTML = '<i class="fas fa-redo"></i>';
        regenerateButton.title = 'បង្កើតការឆ្លើយតបឡើងវិញ';
        regenerateButton.addEventListener('click', (e) => {
          e.stopPropagation();
          regenerateResponse(messageDiv);
        });
        
        actionButtons.append(copyButton, likeButton, regenerateButton);
      }
      
      messageMeta.appendChild(actionButtons);
    } else {
      messageMeta.appendChild(timeElement);
    }
    
    messageDiv.append(messageContent, messageMeta);
    
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage && sender === 'user') {
      welcomeMessage.remove();
    }
    
    chatWindow.appendChild(messageDiv);
    
    if (shouldAutoScroll && !userHasScrolledUp) {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  }

  async function handleImageGeneration() {
    const prompt = messageInput.value.trim().replace("Generate image:", "").trim();
    if (!prompt) {
      alert("សូមបញ្ចូលការពិពណ៌នាសម្រាប់រូបភាពបន្ទាប់ពី 'Generate image:'\n\nឧទាហរណ៍ 'Generate image: Angkor wat ' សូមសរសេរវាជាភាសា ភាសាអង់គ្លេស ");
      return;
    }
    
    const timestamp = new Date().toISOString();
    addMessageToUI(`Generate image: ${prompt}`, 'user', timestamp);
    
    const userMessageData = {
      role: 'user',
      text: `Generate image: ${prompt}`,
      timestamp: timestamp
    };
    
    chats[currentChatId].messages.push(userMessageData);
    saveChats();
    
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    await generateImage(prompt);
  }

  async function generateImage(prompt) {
    showTypingIndicator();
    const timestamp = new Date().toISOString();
    const tempMessageId = 'temp-' + Date.now();

    const tempMessageDiv = document.createElement('div');
    tempMessageDiv.id = tempMessageId;
    tempMessageDiv.className = 'message ai-message';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = "កំពុងបង្កើតរូបភាព...";
    
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
    
    chatWindow.appendChild(tempMessageDiv);
    
    if (shouldAutoScroll && !userHasScrolledUp) {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    try {
      const requestBody = [
        {
          taskType: "authentication",
          apiKey: IMAGE_API_KEY
        },
        {
          taskType: "imageInference",
          taskUUID: "39d7207a-87ef-4c93-8082-1431f9c1dc97",
          positivePrompt: prompt,
          width: 1344,
          height: 896,
          model: "rundiffusion:130@100",
          numberResults: 1
        }
      ];

      const response = await fetch("https://api.runware.ai/v1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      const imageUrl = result?.data?.[0]?.imageURL;

      if (imageUrl) {
        document.getElementById(tempMessageId)?.remove();
        
        const imageMessage = {
          role: 'model',
          text: `រូបភាពដែលបានបង្កើតដោយផ្អែកលើ: "${prompt}"`,
          timestamp: new Date().toISOString(),
          imageUrl: imageUrl
        };
        
        chats[currentChatId].messages.push({
          role: 'model',
          text: imageMessage.text,
          timestamp: imageMessage.timestamp,
          imageUrl: imageUrl
        });
        
        conversationHistory.push({
          role: 'model',
          content: imageMessage.text
        });
        
        saveChats();
        
        addMessageToUI(imageMessage.text, 'ai', imageMessage.timestamp, null, imageUrl);
      } else {
        throw new Error("បរាជ័យក្នុងការ ផ្ញើទៅម៉ាស៊ីនមេ");
      }
    } catch (error) {
      console.error("កំហុសក្នុងការបង្កើតរូបភាព:", error);
      document.getElementById(tempMessageId)?.remove();
      addMessageToUI("⚠️ បរាជ័យក្នុងការបង្កើតរូបភាព: " + error.message, 'ai', new Date().toISOString());
    } finally {
      hideTypingIndicator();
    }
  }

  function updateActiveChatIndicator() {
    document.querySelectorAll('.chat-item').forEach(item => {
      item.classList.toggle('active', item.dataset.chatId === currentChatId);
    });
  }

  function showTypingIndicator() {
    typingIndicator.style.display = 'flex';
    sendButton.disabled = true;
    sendButton.classList.add('disabled');
    
    if (shouldAutoScroll && !userHasScrolledUp) {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  }

  function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
    sendButton.disabled = false;
    sendButton.classList.remove('disabled');
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

  chatWindow.addEventListener('scroll', function() {
    const threshold = 100;
    const isNearBottom = chatWindow.scrollHeight - chatWindow.scrollTop - chatWindow.clientHeight <= threshold;
    
    if (!isNearBottom) {
      userHasScrolledUp = true;
    } else if (isNearBottom && userHasScrolledUp) {
      userHasScrolledUp = false;
      shouldAutoScroll = true;
    }
  });

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
  
  sendButton.addEventListener('click', function() {
    if (!isAIResponding) {
      sendMessage();
    }
  });
  
  newChatBtn.addEventListener('click', createNewChat);
  
  featureCards.forEach(card => {
    card.addEventListener('click', function() {
      const prompt = this.getAttribute('data-prompt');
      messageInput.value = prompt;
      messageInput.focus();
    });
  });
  
  messageInput.focus();
  
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && isSidebarOpen) {
      closeSidebarFn();
    }
  });
 // Add the required CSS styles
  const style = document.createElement('style');
  style.textContent = `
    /* Chat container improvements */
    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      padding-bottom: 100px;
      height: calc(100vh - 60px);
      overflow: hidden;
    }
    
    .chat-window {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;
      overscroll-behavior: contain;
    }
    
    .message {
      overflow-anchor: none;
    }
    
    /* Improved input area layout */

    
    .input-container {
      display: flex;
      align-items: center;
      background: #f9fafb;
      border-radius: 12px;
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
      gap: 8px;
    }

    /* Improved button layout */
    .generate-image-btn {
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      transition: all 0.2s ease;
    }
    
    .generate-image-btn:hover {
      background: #f3f4f6;
      color: #1f2937;
    }
    

    /* Image preview modal */
    .image-preview-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(5px);
    }
    
    .modal-content {
      position: relative;
      max-width: 90%;
      max-height: 90%;
      text-align: center;
    }
    
    .modal-image {
      max-width: 100%;
      max-height: 80vh;
      border-radius: 12px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    }
    
    .close-modal {
      position: absolute;
      top: -40px;
      right: -10px;
      background: none;
      border: none;
      color: white;
      font-size: 30px;
      cursor: pointer;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .download-image-btn {
      display: inline-block;
      margin-top: 15px;
      padding: 10px 20px;
      background: #2563eb;
      color: white;
      border-radius: 6px;
      text-decoration: none;
      font-size: 16px;
      transition: background 0.2s;
    }
    
    .download-image-btn:hover {
      background: #1d4ed8;
    }
    
    /* Image container in messages */
    .image-container {
      margin-top: 10px;
      position: relative;
    }
    
    .generated-image {
      max-width: 100%;
      max-height: 400px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      cursor: zoom-in;
      transition: transform 0.2s;
    }
    
    .generated-image:hover {
      transform: scale(1.02);
    }
    
    .download-btn {
      display: inline-block;
      margin-top: 8px;
      padding: 6px 12px;
      background: #2563eb;
      color: white;
      border-radius: 6px;
      text-decoration: none;
      font-size: 14px;
      transition: background 0.2s;
    }
    
    .download-btn:hover {
      background: #1d4ed8;
    }
    
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
  `;
  document.head.appendChild(style);
  
  // Initialize the app
  
// ✅ handleAIResponse function with Lim Cartoon II Enhancements
function handleAIResponse(aiResponseText) {
  // If response includes mention of Lim Cartoon II, show icon links and thumbnail
  if (/#limcartoon/i.test(aiResponseText)) {
    const limBox = document.createElement("div");
    limBox.className = "lim-cartoon-box";
    limBox.innerHTML = `
      <p><strong>🔗 តំណភ្ជាប់របស់ Lim Cartoon II:</strong></p>
      <div class="lim-links">
        <a href="https://www.youtube.com/@LimCartoonII" target="_blank" class="lim-link">
          <img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" alt="YouTube" class="lim-icon">
          YouTube
        </a>
        <a href="https://www.tiktok.com/@lim_cartoon" target="_blank" class="lim-link">
          <img src="../mey/tiktok.png" alt="TikTok" class="lim-icon">
          TikTok <!--https://cdn-icons-png.flaticon.com/512/3046/3046122-->
        </a>
        <a href="https://www.facebook.com/LimCartoon168" target="_blank" class="lim-link">
          <img src="https://cdn-icons-png.flaticon.com/512/1384/1384053.png" alt="Facebook" class="lim-icon">
          Facebook
        </a>
      </div>
    `;
    chatWindow.appendChild(limBox);

    const thumbnail = document.createElement("div");
    thumbnail.className = "lim-thumbnail";
    thumbnail.innerHTML = `
      <p style="margin-top: 16px;"><strong>🎬 វីដេអូដែលពេញនិយម:</strong></p>
      <a href="https://www.youtube.com/watch?v=cfje95P14M8" target="_blank" class="thumb-card">
        <img src="https://i.ytimg.com/vi/cfje95P14M8/hqdefault.jpg" alt="ខ្មោចម៉ាំមី" class="thumb-img">
        <div class="thumb-info">
          <span class="thumb-title">ខ្មោចម៉ាំមី – Mummy Ghost</span>
          <span class="thumb-desc">វីដេអូកំប្លែងខ្មែរដែលទស្សនាជាង 300,000 ដង</span>
        </div>
      </a>
    `;
    chatWindow.appendChild(thumbnail);
  }
}

// ✅ Append Lim Cartoon styles
const limStyle = document.createElement("style");
limStyle.textContent = `
.lim-cartoon-box {
  background: #f9f9ff;
  border: 1px solid #ddd;
  padding: 12px;
  border-radius: 10px;
  margin-top: 10px;
  font-size: 15px;
}
.lim-links {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.lim-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  text-decoration: none;
  color: #222;
  transition: background 0.2s ease;
}
.lim-link:hover {
  background: #f0f0ff;
}
.lim-icon {
  width: 24px;
  height: 24px;
}
.lim-thumbnail {
  margin-top: 10px;
}
.thumb-card {
  display: flex;
  text-decoration: none;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 10px;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}
.thumb-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.thumb-img {
  width: 160px;
  height: 90px;
  object-fit: cover;
}
.thumb-info {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.thumb-title {
  font-weight: bold;
  font-size: 14px;
  color: #111;
}
.thumb-desc {
  font-size: 12px;
  color: #555;
  margin-top: 4px;
}`;
document.head.appendChild(limStyle);


  initApp();
});

// Force sidebar open on desktop
if (window.innerWidth > 768) {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.add('visible');
}