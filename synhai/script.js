(() => {
  "use strict";

  const CONFIG = window.SYNH_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const els = {
    sidebar: $("sidebar"),
    overlay: $("sidebar-overlay"),
    menu: $("menu-toggle"),
    close: $("close-sidebar"),
    newChat: $("new-chat-btn"),
    newChatText: $("new-chat-text"),
    history: $("chat-history"),
    chatWindow: $("chat-window"),
    messages: $("messages"),
    welcome: $("welcome-message"),
    form: $("chat-form"),
    input: $("message-input"),
    send: $("send-button"),
    typing: $("typing-indicator"),
    status: $("status-text"),
    statusWrap: $("connection-status"),
    file: $("file-input"),
    attachment: $("attachment-preview"),
    toast: $("toast"),
    themeToggle: $("theme-toggle"),
    themeLabel: $("theme-label"),
    profileAvatar: $("profile-avatar-img")
  };

  const STORAGE_KEY = CONFIG.storageKey || "synh-ai-v2";
  const MAX_CHATS = 40;
  let chats = [];
  let activeChatId = null;
  let busy = false;
  let controller = null;
  let selectedFile = null;
  let toastTimer = null;
  let language = localStorage.getItem("synh-ai-language") || "km";
  let theme = localStorage.getItem("synh-ai-theme") || "light";

  const I18N = {
    km: {
      newChat:"ជជែកថ្មី", recent:"ការជជែកថ្មីៗ", empty:"មិនទាន់មានប្រវត្តិជជែក",
      welcome:"សួស្តី! តើខ្ញុំអាចជួយអ្វីអ្នកបាន?", welcomeDesc:"សួរសំណួរ សរសេរ បកប្រែ ឬស្វែងយល់អំពីប្រធានបទថ្មីៗជាភាសាខ្មែរ។",
      general:"សំណួរទូទៅ", generalDesc:"ស្វែងយល់ពីប្រធានបទផ្សេងៗ", writing:"ជំនួយការសរសេរ", writingDesc:"សរសេរ និងកែសម្រួលអត្ថបទ",
      translate:"ការបកប្រែ", translateDesc:"បកប្រែរវាងភាសាផ្សេងៗ", learn:"រៀនអ្វីថ្មី", learnDesc:"រៀនជាជំហានៗ",
      placeholder:"សរសេរសាររបស់អ្នក...", appearance:"រូបរាង", language:"ភាសា",
      disclaimer:"Synh AI អាចមានកំហុស។ សូមពិនិត្យព័ត៌មានសំខាន់ៗឡើងវិញ។",
      typing:"Synh AI កំពុងគិត...", ready:"រួចរាល់", connecting:"កំពុងភ្ជាប់…", light:"ភ្លឺ", dark:"ងងឹត",
      user:"អ្នក", copy:"ចម្លងចម្លើយ", copied:"បានចម្លងចម្លើយ", copyFail:"មិនអាចចម្លងបានទេ"
    },
    en: {
      newChat:"New chat", recent:"Recent chats", empty:"No chat history yet",
      welcome:"Hello! How can I help you today?", welcomeDesc:"Ask questions, write, translate, or explore new topics.",
      general:"General questions", generalDesc:"Explore different topics", writing:"Writing assistant", writingDesc:"Write and edit content",
      translate:"Translation", translateDesc:"Translate between languages", learn:"Learn something new", learnDesc:"Learn step by step",
      placeholder:"Type your message...", appearance:"Appearance", language:"Language",
      disclaimer:"Synh AI can make mistakes. Please verify important information.",
      typing:"Synh AI is thinking...", ready:"Ready", connecting:"Connecting…", light:"Light", dark:"Dark",
      user:"You", copy:"Copy response", copied:"Response copied", copyFail:"Could not copy"
    }
  };
  const t = key => I18N[language]?.[key] || I18N.en[key] || key;

  function applyPreferences() {
    document.documentElement.lang = language;
    document.body.dataset.theme = theme;
    document.querySelectorAll("[data-i18n]").forEach(el => {
      if (I18N[language][el.dataset.i18n]) el.textContent = t(el.dataset.i18n);
    });
    
    if (els.newChatText) {
      els.newChatText.textContent = t("newChat");
    } else if (els.newChat && els.newChat.lastChild) {
      els.newChat.lastChild.textContent = " " + t("newChat");
    }
    
    const recentHeading = document.querySelector(".history-heading");
    if (recentHeading) recentHeading.textContent = t("recent");
    
    const welcomeH1 = els.welcome?.querySelector("h1");
    if (welcomeH1) welcomeH1.textContent = t("welcome");
    
    const welcomeDesc = els.welcome?.querySelector(".welcome-description");
    if (welcomeDesc) welcomeDesc.textContent = t("welcomeDesc");
    
    const keys = [["general","generalDesc"],["writing","writingDesc"],["translate","translateDesc"],["learn","learnDesc"]];
    document.querySelectorAll(".feature-card").forEach((card,i) => {
      if (keys[i]) {
        const strong = card.querySelector("strong");
        const small = card.querySelector("small");
        if (strong) strong.textContent = t(keys[i][0]);
        if (small) small.textContent = t(keys[i][1]);
      }
    });
    
    if (els.input) els.input.placeholder = t("placeholder");
    
    const typingSmall = els.typing?.querySelector("small");
    if (typingSmall) typingSmall.textContent = t("typing");
    
    if (els.themeToggle) {
      els.themeToggle.innerHTML = `<i class="fa-solid ${theme === "light" ? "fa-sun" : "fa-moon"}"></i><span>${t(theme)}</span>`;
    }
    
    document.querySelectorAll(".language-button").forEach(btn => btn.classList.toggle("active", btn.dataset.language === language));
    renderMessages();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }

  function renderMarkdown(target, source) {
    const raw = window.marked ? marked.parse(source, {gfm:true, breaks:true, tables:true}) : null;
    target.innerHTML = window.DOMPurify && raw
      ? DOMPurify.sanitize(raw, {USE_PROFILES:{html:true}})
      : escapeHtml(source).replace(/\n/g,"<br>");
    target.querySelectorAll("a").forEach(a => { a.target="_blank"; a.rel="noopener noreferrer"; });
    target.querySelectorAll("pre code").forEach(block => { if (window.hljs) hljs.highlightElement(block); });
    if (window.renderMathInElement) renderMathInElement(target, {
      delimiters:[
        {left:"$$",right:"$$",display:true},{left:"\[",right:"\]",display:true},
        {left:"$",right:"$",display:false},{left:"\(",right:"\)",display:false}
      ], throwOnError:false
    });
  }

  const makeId = () => (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function safeLoad() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(c => c && typeof c.id === "string" && Array.isArray(c.messages))
        .slice(0, MAX_CHATS)
        .map(c => ({
          id: c.id,
          title: String(c.title || "ការជជែកថ្មី").slice(0, 80),
          updatedAt: Number(c.updatedAt) || Date.now(),
          messages: c.messages
            .filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
            .slice(-100)
            .map(m => ({ role: m.role, content: m.content.slice(0, 20000) }))
        }));
    } catch (error) {
      console.warn("Synh AI: local history could not be read.", error);
      return [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.slice(0, MAX_CHATS)));
    } catch (error) {
      console.warn("Synh AI: local history could not be saved.", error);
      showToast("ទំហំប្រវត្តិជជែកពេញ។ សូមលុបការជជែកចាស់ខ្លះ។");
    }
  }

  function currentChat() {
    return chats.find(c => c.id === activeChatId) || null;
  }

  function createChat(render = true) {
    if (busy) return;
    const chat = { id: makeId(), title: "ការជជែកថ្មី", updatedAt: Date.now(), messages: [] };
    chats.unshift(chat);
    chats = chats.slice(0, MAX_CHATS);
    activeChatId = chat.id;
    persist();
    if (render) renderAll();
    closeSidebar();
  }

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("visible"), 3200);
  }

  function setStatus(message, state = "ready") {
    if (els.status) els.status.textContent = message;
    if (els.statusWrap) els.statusWrap.dataset.state = state;
  }

  function openSidebar() {
    els.sidebar?.classList.add("visible");
    els.overlay?.classList.add("visible");
  }

  function closeSidebar() {
    els.sidebar?.classList.remove("visible");
    els.overlay?.classList.remove("visible");
  }

  function renderHistory() {
    if (!els.history) return;
    els.history.replaceChildren();
    chats.forEach(chat => {
      const row = document.createElement("div");
      row.className = `history-item${chat.id === activeChatId ? " active" : ""}`;
      
      const open = document.createElement("button");
      open.className = "history-open";
      open.type = "button";
      open.textContent = chat.title;
      open.title = chat.title;
      open.addEventListener("click", () => {
        if (busy) return;
        activeChatId = chat.id;
        renderAll();
        closeSidebar();
      });

      const del = document.createElement("button");
      del.className = "history-delete";
      del.type = "button";
      del.title = "លុបការជជែក";
      del.setAttribute("aria-label", "Delete chat");
      del.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
      del.addEventListener("click", (event) => {
        event.stopPropagation();
        if (busy) return;
        chats = chats.filter(c => c.id !== chat.id);
        if (activeChatId === chat.id) activeChatId = chats[0]?.id || null;
        if (!activeChatId) createChat(false);
        persist();
        renderAll();
      });

      row.append(open, del);
      els.history.append(row);
    });

    if (!chats.length) {
      const empty = document.createElement("p");
      empty.className = "history-empty";
      empty.textContent = t("empty");
      els.history.append(empty);
    }
  }

  function addMessage(role, content, animate = false) {
    if (!els.messages) return;
    const article = document.createElement("article");
    article.className = `message ${role === "user" ? "user-message" : "ai-message"}`;
    
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    const avatarImage = document.createElement("img");
    avatarImage.alt = role === "user" ? t("user") : "Synh AI";
    avatarImage.src = CONFIG.avatars?.[role] || (role === "user" ? "https://i.pravatar.cc/120?img=12" : "https://api.dicebear.com/9.x/bottts/svg?seed=SynhAI");
    avatarImage.onerror = () => { avatar.textContent = role === "user" ? "U" : "AI"; };
    avatar.append(avatarImage);
    
    const body = document.createElement("div");
    body.className = "message-body";
    
    const label = document.createElement("div");
    label.className = "message-label";
    label.textContent = role === "user" ? t("user") : "Synh AI";
    
    const text = document.createElement("div");
    text.className = "message-content";
    text.textContent = content;
    
    body.append(label, text);

    if (role === "assistant") {
      const actions = document.createElement("div");
      actions.className = "message-actions";
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "action-btn";
      copy.title = t("copy");
      copy.innerHTML = '<i class="fa-regular fa-copy"></i>';
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(content);
          showToast(t("copied"));
        } catch {
          showToast(t("copyFail"));
        }
      });
      actions.append(copy);
      body.append(actions);
    }

    if (role === "user") article.append(body, avatar);
    else article.append(avatar, body);
    if (animate) article.classList.add("message-enter");
    els.messages.append(article);
    scrollToBottom();
    return text;
  }

  function scrollToBottom() {
    if (!els.chatWindow) return;
    requestAnimationFrame(() => {
      els.chatWindow.scrollTop = els.chatWindow.scrollHeight;
    });
  }

  async function typeText(target, content) {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced || content.length > 5000) {
      renderMarkdown(target, content);
      return;
    }
    let index = 0;
    const step = 5;
    await new Promise(resolve => {
      function frame() {
        index = Math.min(index + step, content.length);
        target.textContent = content.slice(0, index);
        if (index < content.length) {
          scrollToBottom();
          requestAnimationFrame(frame);
        } else {
          renderMarkdown(target, content);
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  function renderMessages() {
    if (!els.messages) return;
    els.messages.replaceChildren();
    const chat = currentChat();
    const hasMessages = !!chat?.messages.length;
    if (els.welcome) els.welcome.hidden = hasMessages;
    if (chat) chat.messages.forEach(m => addMessage(m.role, m.content));
    scrollToBottom();
  }

  function renderAll() {
    renderHistory();
    renderMessages();
  }

  async function requestAI(chat) {
    const apiKey = String(CONFIG.apiKey || "").trim();
    const model = String(CONFIG.model || "gemini-2.5-flash").trim();

    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
      throw new Error("សូមកំណត់ API key នៅក្នុង config.js ជាមុនសិន។");
    }

    const baseUrl = typeof CONFIG.getApiUrl === "function"
      ? CONFIG.getApiUrl()
      : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const timeout = Math.max(5000, Number(CONFIG.requestTimeoutMs) || 30000);
    controller = new AbortController();
    const timeoutId = setTimeout(() => controller?.abort(), timeout);

    try {
      const systemPrompt = String(CONFIG.systemPrompt || "You are Synh AI.");
      const historyLimit = Math.max(2, Number(CONFIG.maxHistoryMessages) || 20);

      const contents = chat.messages
        .slice(-historyLimit)
        .filter(m => m && (m.role === "user" || m.role === "assistant"))
        .map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: String(m.content || "") }]
        }));

      const url = `${baseUrl}?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: Number(CONFIG.generation?.temperature ?? 0.7),
            topP: Number(CONFIG.generation?.topP ?? 0.95),
            topK: Number(CONFIG.generation?.topK ?? 40),
            maxOutputTokens: Number(CONFIG.generation?.maxOutputTokens ?? 2048)
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || `API Error Status: ${response.status}`);
      }

      const reply = data?.candidates?.[0]?.content?.parts
        ?.map(p => p.text)
        .join("")
        .trim();

      if (!reply) {
        throw new Error("Synh AI មិនទាន់អាចឆ្លើយបានទេ។ សូមសាកល្បងម្ដងទៀត។");
      }

      return reply;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("ការភ្ជាប់ទៅ Synh AI ចំណាយពេលយូរពេក។ សូមពិនិត្យអ៊ីនធឺណិត ហើយសាកល្បងម្ដងទៀត។");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      controller = null;
    }
  }

  async function sendMessage(text) {
    const clean = text.trim();
    if (!clean || busy) return;
    if (!activeChatId) createChat(false);
    const chat = currentChat();
    if (!chat) return;

    busy = true;
    if (els.send) els.send.disabled = true;
    if (els.input) els.input.disabled = true;
    if (els.typing) els.typing.hidden = false;
    if (els.welcome) els.welcome.hidden = true;
    
    chat.messages.push({ role: "user", content: clean });
    if (chat.title === "ការជជែកថ្មី") {
      chat.title = clean.slice(0, 42) + (clean.length > 42 ? "…" : "");
    }
    chat.updatedAt = Date.now();
    
    addMessage("user", clean, true);
    persist();
    renderHistory();
    setStatus(t("connecting"), "busy");
    scrollToBottom();

    try {
      const answer = await requestAI(chat);
      chat.messages.push({ role: "assistant", content: answer });
      chat.updatedAt = Date.now();
      const target = addMessage("assistant", "", true);
      if (target) await typeText(target, answer);
      persist();
      renderHistory();
      setStatus(t("ready"), "ready");
    } catch (error) {
      const message = error.message || "មានបញ្ហាក្នុងការភ្ជាប់ទៅ AI។";
      addMessage("assistant", `សូមអភ័យទោស៖ ${message}`);
      setStatus("Connection issue", "error");
      showToast(message);
    } finally {
      busy = false;
      if (els.send) els.send.disabled = false;
      if (els.input) els.input.disabled = false;
      if (els.typing) els.typing.hidden = true;
      els.input?.focus();
      scrollToBottom();
    }
  }

  function clearAttachment() {
    selectedFile = null;
    if (els.file) els.file.value = "";
    if (els.attachment) {
      els.attachment.replaceChildren();
      els.attachment.hidden = true;
    }
  }

  function handleFile(file) {
    clearAttachment();
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      showToast("ឯកសារធំពេក។ សូមជ្រើសរើសឯកសារតូចជាង 8MB។");
      return;
    }
    selectedFile = file;
    const item = document.createElement("div");
    item.className = "attachment-chip";
    const icon = document.createElement("i");
    icon.className = file.type.startsWith("image/") ? "fa-regular fa-image" : "fa-regular fa-file-lines";
    const name = document.createElement("span");
    name.textContent = file.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", "Remove attachment");
    remove.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    remove.addEventListener("click", clearAttachment);
    item.append(icon, name, remove);
    if (els.attachment) {
      els.attachment.append(item);
      els.attachment.hidden = false;
    }
  }

  function autoResize() {
    if (!els.input) return;
    els.input.style.height = "auto";
    els.input.style.height = `${Math.min(els.input.scrollHeight, 180)}px`;
  }

  function init() {
    chats = safeLoad();
    activeChatId = chats[0]?.id || null;
    if (!activeChatId) createChat(false);
    if (els.profileAvatar) {
      els.profileAvatar.src = CONFIG.avatars?.user || "https://i.pravatar.cc/120?img=12";
      els.profileAvatar.onerror = () => { els.profileAvatar.style.display = "none"; };
    }
    applyPreferences();
    renderAll();

    els.menu?.addEventListener("click", openSidebar);
    els.close?.addEventListener("click", closeSidebar);
    els.overlay?.addEventListener("click", closeSidebar);
    els.newChat?.addEventListener("click", () => createChat());
    els.themeToggle?.addEventListener("click", () => {
      theme = theme === "light" ? "dark" : "light";
      localStorage.setItem("synh-ai-theme", theme);
      applyPreferences();
    });
    document.querySelectorAll(".language-button").forEach(btn => btn.addEventListener("click", () => {
      language = btn.dataset.language;
      localStorage.setItem("synh-ai-language", language);
      applyPreferences();
    }));

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeSidebar();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!busy) createChat();
      }
    });

    els.form?.addEventListener("submit", async e => {
      e.preventDefault();
      const text = els.input?.value || "";
      if (selectedFile) {
        showToast("ការភ្ជាប់ឯកសារត្រូវការការគាំទ្រពី backend។ សូមផ្ញើអត្ថបទជាមុនសិន។");
        return;
      }
      if (els.input) els.input.value = "";
      autoResize();
      await sendMessage(text);
    });

    els.input?.addEventListener("input", autoResize);
    els.input?.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        els.form?.requestSubmit();
      }
    });

    els.file?.addEventListener("change", e => handleFile(e.target.files?.[0]));

    document.querySelectorAll(".feature-card").forEach(card => {
      card.addEventListener("click", () => {
        if (els.input) {
          els.input.value = card.dataset.prompt || "";
          autoResize();
          els.input.focus();
        }
      });
    });

    window.addEventListener("online", () => setStatus("Online", "ready"));
    window.addEventListener("offline", () => setStatus("Offline", "error"));
    setStatus(navigator.onLine ? "Ready" : "Offline", navigator.onLine ? "ready" : "error");
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
