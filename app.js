let sessions = [];
let currentId = null;
let isStreaming = false;
let abortController = null;
let pendingFiles = [];
let isDark = localStorage.getItem('vextion_theme') !== 'light';

try {
  const saved = localStorage.getItem('vextion_sessions');
  if (saved) sessions = JSON.parse(saved);
} catch(e) {}

const messagesDiv = document.getElementById('messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const historyList = document.getElementById('historyList');
const themeBtn = document.getElementById('themeBtn');

document.addEventListener('DOMContentLoaded', () => {
  setTheme(isDark ? 'dark' : 'light');
  setTimeout(() => {
    document.getElementById('intro').classList.add('hide');
    initParticles();
    if (sessions.length === 0) {
      newChat();
    } else {
      loadSession(sessions[0].id);
    }
    renderHistory();
  }, 2000);
  
  input.addEventListener('input', autoResize);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
});

function initParticles() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '0';
  document.body.insertBefore(canvas, document.body.firstChild);
  
  const ctx = canvas.getContext('2d');
  let particles = [];
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 1,
      a: Math.random() * 0.3 + 0.1
    });
  }
  
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = isDarkMode ? `rgba(245,158,11,${p.a})` : `rgba(234,88,12,${p.a * 0.5})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

function toggleTheme() {
  isDark = !isDark;
  setTheme(isDark ? 'dark' : 'light');
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('vextion_theme', theme);
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

function backToCurrentChat() {
  if (currentId) {
    loadSession(currentId);
    const backBtn = document.getElementById('backToChatBtn');
    if (backBtn) backBtn.style.display = 'none';
    if (window.innerWidth <= 700) closeSidebar();
    toast('Back to active chat');
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function newChat() {
  currentId = generateId();
  sessions.unshift({
    id: currentId,
    title: 'New Chat',
    messages: [],
    createdAt: Date.now()
  });
  saveSessions();
  renderHistory();
  showWelcome();
  const backBtn = document.getElementById('backToChatBtn');
  if (backBtn) backBtn.style.display = 'none';
  if (window.innerWidth <= 700) closeSidebar();
  input.focus();
}

function loadSession(id) {
  currentId = id;
  const session = sessions.find(s => s.id === id);
  if (!session) return;
  
  messagesDiv.innerHTML = '';
  if (session.messages.length === 0) {
    showWelcome();
  } else {
    session.messages.forEach(msg => {
      renderMessage(msg.role, msg.content);
    });
  }
  renderHistory();
  scrollToBottom();
  const backBtn = document.getElementById('backToChatBtn');
  if (backBtn) backBtn.style.display = 'none';
}

function deleteSession(id, event) {
  event.stopPropagation();
  sessions = sessions.filter(s => s.id !== id);
  if (currentId === id) {
    if (sessions.length > 0) {
      loadSession(sessions[0].id);
    } else {
      newChat();
    }
  }
  saveSessions();
  renderHistory();
  toast('Chat deleted');
}

function saveSessions() {
  localStorage.setItem('vextion_sessions', JSON.stringify(sessions.slice(0, 50)));
}

function renderHistory() {
  historyList.innerHTML = '';
  sessions.forEach(session => {
    const div = document.createElement('div');
    div.className = `history-item ${session.id === currentId ? 'active' : ''}`;
    div.onclick = () => {
      const backBtn = document.getElementById('backToChatBtn');
      if (backBtn && session.id !== currentId) {
        backBtn.style.display = 'flex';
      } else if (backBtn) {
        backBtn.style.display = 'none';
      }
      loadSession(session.id);
    };
    
    const icon = document.createElement('span');
    icon.textContent = '⚡';
    icon.style.fontSize = '12px';
    
    const title = document.createElement('span');
    title.className = 'history-title';
    title.textContent = session.title;
    
    const del = document.createElement('button');
    del.className = 'history-delete';
    del.innerHTML = '🗑';
    del.onclick = (e) => {
      e.stopPropagation();
      deleteSession(session.id, e);
    };
    
    div.appendChild(icon);
    div.appendChild(title);
    div.appendChild(del);
    historyList.appendChild(div);
  });
}

function getCurrentSession() {
  if (!currentId) newChat();
  return sessions.find(s => s.id === currentId);
}

function showWelcome() {
  messagesDiv.innerHTML = `
    <div class="welcome">
      <div class="welcome-icon">⚡</div>
      <div class="welcome-title">VEXTION</div>
      <div class="welcome-sub">Fast & Powerful AI Assistant by Fery</div>
      <div class="chip-container">
        <div class="chip" onclick="sendChip('Bantu saya mengerjakan soal matematika: 2x + 5 = 15')">📐 Matematika</div>
        <div class="chip" onclick="sendChip('Buatkan kode Python untuk menghitung luas lingkaran')">🐍 Python</div>
        <div class="chip" onclick="sendChip('Jelaskan proses fotosintesis dengan singkat')">🌿 Biologi</div>
        <div class="chip" onclick="sendChip('Buatkan website HTML portofolio sederhana')">🌐 Website</div>
        <div class="chip" onclick="sendChip('Bantu saya membuat essay tentang global warming')">📝 Essay</div>
        <div class="chip" onclick="sendChip('Apa yang bisa kamu bantu?')">✨ Semua Kemampuan</div>
      </div>
    </div>
  `;
}

function sendChip(text) {
  input.value = text;
  sendMessage();
}

function renderMessage(role, content) {
  const isUser = role === 'user';
  const div = document.createElement('div');
  div.className = `message ${isUser ? 'user' : ''}`;
  div.innerHTML = `
    <div class="message-avatar ${isUser ? 'user' : 'ai'}">${isUser ? 'U' : 'V'}</div>
    <div class="message-content">
      <div class="message-name">${isUser ? 'You' : 'VEXTION'}</div>
      <div class="message-bubble ${isUser ? 'user' : 'ai'}">${isUser ? escapeHtml(content).replace(/\n/g, '<br>') : renderMarkdown(content)}</div>
    </div>
  `;
  messagesDiv.appendChild(div);
  scrollToBottom();
  return div;
}

function addTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'message';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="message-avatar ai">V</div>
    <div class="message-content">
      <div class="message-name">VEXTION</div>
      <div class="message-bubble ai">
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>
    </div>
  `;
  messagesDiv.appendChild(div);
  scrollToBottom();
  return div;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

function onFile(input, type) {
  Array.from(input.files).forEach(file => {
    const reader = new FileReader();
    if (type === 'img') {
      reader.onload = e => {
        pendingFiles.push({ type: 'img', name: file.name, url: e.target.result });
        renderFilePreview();
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = e => {
        pendingFiles.push({ type: 'doc', name: file.name, content: e.target.result });
        renderFilePreview();
      };
      reader.readAsText(file);
    }
  });
  input.value = '';
}

function renderFilePreview() {
  const container = document.getElementById('filePreview');
  container.innerHTML = '';
  pendingFiles.forEach((f, i) => {
    const div = document.createElement('div');
    div.className = 'file-preview-item';
    if (f.type === 'img') {
      div.innerHTML = `<img src="${f.url}" alt="${f.name}"><button class="file-remove" onclick="removeFile(${i})">✕</button>`;
    } else {
      div.innerHTML = `<div class="file-preview-doc">📄 ${escapeHtml(f.name)}</div><button class="file-remove" onclick="removeFile(${i})">✕</button>`;
    }
    container.appendChild(div);
  });
}

function removeFile(index) {
  pendingFiles.splice(index, 1);
  renderFilePreview();
}

async function sendMessage() {
  if (isStreaming) {
    if (abortController) abortController.abort();
    return;
  }
  
  const text = input.value.trim();
  if (!text && pendingFiles.length === 0) return;
  
  const session = getCurrentSession();
  const welcome = document.querySelector('.welcome');
  if (welcome) welcome.remove();
  
  let displayText = text;
  let apiContent = [];
  
  pendingFiles.forEach(f => {
    if (f.type === 'img') {
      apiContent.push({ type: 'image_url', image_url: { url: f.url } });
      displayText = `[Image: ${f.name}]\n${displayText}`;
    } else {
      apiContent.push({ type: 'text', text: `[File: ${f.name}]\n${f.content}` });
      displayText = `[File: ${f.name}]\n${displayText}`;
    }
  });
  
  if (text) apiContent.push({ type: 'text', text: text });
  
  const userContent = apiContent.length === 1 && apiContent[0].type === 'text' ? text : apiContent;
  
  renderMessage('user', displayText);
  input.value = '';
  input.style.height = 'auto';
  pendingFiles = [];
  renderFilePreview();
  
  session.messages.push({ role: 'user', content: userContent });
  if (session.messages.filter(m => m.role === 'user').length === 1) {
    session.title = text.substring(0, 40) + (text.length > 40 ? '...' : '');
    renderHistory();
  }
  saveSessions();
  
  const typingIndicator = addTypingIndicator();
  isStreaming = true;
  sendBtn.innerHTML = '⏹';
  sendBtn.classList.add('stop');
  
  try {
    const apiMessages = [
      { role: 'system', content: VEXTION_CONFIG.systemPrompt },
      ...session.messages.slice(-20).map(m => ({
        role: m.role,
        content: m.content
      }))
    ];
    
    abortController = new AbortController();
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VEXTION_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': VEXTION_CONFIG.siteUrl,
        'X-Title': VEXTION_CONFIG.siteName
      },
      body: JSON.stringify({
        model: VEXTION_CONFIG.model,
        messages: apiMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096
      }),
      signal: abortController.signal
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API Error');
    }
    
    removeTypingIndicator();
    const aiMessageDiv = renderMessage('assistant', '');
    const bubble = aiMessageDiv.querySelector('.message-bubble');
    let fullResponse = '';
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullResponse += delta;
            const cleanText = fullResponse.replace(/\[FILE_CREATE:[\s\S]*$/, '');
            bubble.innerHTML = renderMarkdown(cleanText) + '<span class="typing-cursor"></span>';
            scrollToBottom();
          }
        } catch(e) {}
      }
    }
    
    const { clean, files } = parseFiles(fullResponse);
    bubble.innerHTML = renderMarkdown(clean);
    files.forEach(file => {
      bubble.appendChild(createFileCard(file.name, file.content));
    });
    
    session.messages.push({ role: 'assistant', content: fullResponse });
    saveSessions();
    
  } catch (error) {
    removeTypingIndicator();
    if (error.name !== 'AbortError') {
      renderMessage('assistant', `❌ Error: ${error.message}\n\nERROR`);
    }
  } finally {
    isStreaming = false;
    abortController = null;
    sendBtn.innerHTML = '→';
    sendBtn.classList.remove('stop');
    scrollToBottom();
  }
}

function parseFiles(text) {
  const files = [];
  const regex = /\[FILE_CREATE:(.*?)\]([\s\S]*?)\[\/FILE_CREATE\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    files.push({ name: match[1].trim(), content: match[2].trim() });
  }
  const clean = text.replace(/\[FILE_CREATE:[\s\S]*?\[\/FILE_CREATE\]/g, '').trim();
  return { clean, files };
}

function createFileCard(filename, content) {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = { html: '🌐', py: '🐍', js: '📜', css: '🎨', json: '📋', txt: '📝', md: '📓' };
  const icon = icons[ext] || '📁';
  
  const card = document.createElement('div');
  card.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--surface2);border:1px solid var(--border2);border-radius:12px;margin-top:10px';
  card.innerHTML = `
    <div style="font-size:24px">${icon}</div>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:600">${escapeHtml(filename)}</div>
      <div style="font-size:11px;color:var(--text3)">${ext.toUpperCase()} · ${Math.ceil(content.length / 1024)}KB</div>
    </div>
    <button class="download-file-btn" style="background:linear-gradient(135deg,var(--primary),var(--primary2));border:none;color:white;padding:6px 12px;border-radius:8px;cursor:pointer">Download</button>
  `;
  card.querySelector('.download-file-btn').onclick = () => downloadFile(filename, content);
  return card;
}

function downloadFile(name, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Downloaded ${name}`);
}

function renderMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => `
    <div class="code-block">
      <div class="code-header">
        <span class="code-lang">${lang || 'code'}</span>
        <div class="code-actions">
          <button class="code-btn" onclick="copyCode(this)">Copy</button>
        </div>
      </div>
      <pre>${code}</pre>
    </div>
  `);
  
  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--surface2);padding:2px 6px;border-radius:4px">$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="margin:10px 0 6px;color:var(--primary)">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="margin:12px 0 8px;color:var(--primary)">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="margin:16px 0 10px;color:var(--primary)">$1</h1>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul style="margin:8px 0;padding-left:20px">$1</ul>');
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

function copyCode(btn) {
  const code = btn.closest('.code-block').querySelector('pre').textContent;
  navigator.clipboard.writeText(code);
  const original = btn.textContent;
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = original, 2000);
  toast('Code copied!');
}

function autoResize() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
}

function scrollToBottom() {
  setTimeout(() => {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }, 50);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str || '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

window.toggleTheme = toggleTheme;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.backToCurrentChat = backToCurrentChat;
window.newChat = newChat;
window.sendMessage = sendMessage;
window.sendChip = sendChip;
window.onFile = onFile;
window.removeFile = removeFile;
window.copyCode = copyCode;
window.downloadFile = downloadFile;