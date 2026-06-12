const $ = id => document.getElementById(id);

let allData = null;
let currentItemId = null;
let currentOtherUser = null;
let refreshTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  const username = Auth.getUser();
  if (!username) {
    window.location.href = 'index.html';
    return;
  }

  Auth.updateUI();
  updateFavCount();
  updateUnreadBadge();

  const urlParams = new URLSearchParams(window.location.search);
  const openItem = urlParams.get('item');
  const openUser = urlParams.get('user');

  await loadConversations();

  if (openItem && openUser) {
    openConversation(openItem, openUser);
  }

  // Send on button click
  $('chat-send-btn').addEventListener('click', handleSend);
  // Send on Enter (Shift+Enter for newline)
  $('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
  // Back button (mobile)
  $('chat-back-btn').addEventListener('click', () => {
    $('chat-thread').style.display = 'none';
    $('chat-placeholder').style.display = '';
  });

  // Start auto-refresh every 10s
  refreshTimer = setInterval(refreshMessages, 10000);

  Lang.onChange(() => {
    const header = $('chat-thread-user');
    if (header && currentOtherUser) {
      header.textContent = currentOtherUser;
    }
  });
});

async function loadConversations() {
  allData = await fetchAll(true);
  const convos = getConversations(allData);
  const container = $('chat-conversations');
  const loading = $('chat-loading');
  if (loading) loading.remove();

  if (convos.length === 0) {
    container.innerHTML = `
      <div class="empty-state chat-empty-convos">
        <div class="empty-state-icon">📭</div>
        <p class="empty-state-text" data-i18n="chat.no.conversations">Нет диалогов</p>
      </div>
    `;
    return;
  }

  container.innerHTML = convos.map(m => {
    const other = m.from === Auth.getUser() ? m.to : m.from;
    const unread = allData.messages.filter(x => x.itemId === m.itemId && x.to === Auth.getUser() && !x.read).length;
    const isActive = currentItemId === m.itemId && currentOtherUser === other;
    return `
      <div class="chat-conv-item ${isActive ? 'active' : ''}" data-item="${m.itemId}" data-other="${other}">
        <div class="chat-conv-info">
          <div class="chat-conv-user">${other}</div>
          <div class="chat-conv-item-title">${m.itemTitle}</div>
          <div class="chat-conv-preview">${escapeHtml(m.text)}</div>
        </div>
        ${unread > 0 ? `<span class="chat-unread-badge">${unread}</span>` : ''}
      </div>
    `;
  }).join('');

  container.querySelectorAll('.chat-conv-item').forEach(el => {
    el.addEventListener('click', () => {
      openConversation(el.dataset.item, el.dataset.other);
    });
  });
}

async function openConversation(itemId, otherUser) {
  currentItemId = itemId;
  currentOtherUser = otherUser;

  $('chat-placeholder').style.display = 'none';
  $('chat-thread').style.display = '';
  $('chat-thread-user').textContent = otherUser;
  $('chat-input').value = '';
  $('chat-input').focus();

  // Find item title
  const item = allData.items.find(i => i.id === itemId);
  $('chat-thread-item').textContent = item ? item.title : '';

  // Mark as read
  await markConversationRead(itemId, otherUser);

  // Re-fetch to get latest
  allData = await fetchAll(true);
  renderMessages();
  loadConversations();
  updateUnreadBadge();
}

function renderMessages() {
  const container = $('chat-messages');
  const msgs = getMessages(allData, currentItemId, currentOtherUser);
  const user = Auth.getUser();

  if (msgs.length === 0) {
    container.innerHTML = `<div class="chat-empty-msg" data-i18n="chat.no.messages">Нет сообщений</div>`;
    return;
  }

  container.innerHTML = msgs.map(m => {
    const isMine = m.from === user;
    return `
      <div class="chat-msg ${isMine ? 'chat-msg-mine' : 'chat-msg-theirs'}">
        <div class="chat-msg-text">${escapeHtml(m.text)}</div>
        <div class="chat-msg-time">${formatChatTime(m.createdAt)}</div>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

async function handleSend() {
  const input = $('chat-input');
  const text = input.value.trim();
  if (!text || !currentItemId || !currentOtherUser) return;

  input.disabled = true;
  try {
    const item = allData.items.find(i => i.id === currentItemId);
    await sendMessage(currentItemId, item ? item.title : '', currentOtherUser, text);
    input.value = '';
    input.style.height = 'auto';
    allData = await fetchAll(true);
    renderMessages();
    loadConversations();
    updateUnreadBadge();
  } catch (e) {
    showToast(e.message || 'Ошибка отправки', 'error');
  }
  input.disabled = false;
  input.focus();
}

async function refreshMessages() {
  if (!currentItemId || !currentOtherUser) {
    // Just update unread count
    allData = await fetchAll(true);
    loadConversations();
    updateUnreadBadge();
    return;
  }
  allData = await fetchAll(true);
  renderMessages();
  loadConversations();
  updateUnreadBadge();
}

function formatChatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ' ' + time;
}
