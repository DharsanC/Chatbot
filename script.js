// --- CONFIGURATION ---
const API_KEY = "AIzaSyDYFgP0Lkrk4Tw9f-PPk3kO4VAyT-g7ddQ";
const MODEL_NAME = "gemini-2.5-flash"; // Confirmed working model
// Use v1 for better stability in generic environments
const API_URL = `https://generativelanguage.googleapis.com/v1/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// --- STATE MANAGEMENT ---
let chats = JSON.parse(localStorage.getItem('chats')) || [
    {
        id: Date.now(),
        title: 'New Chat',
        messages: [
            { role: 'bot', text: "Hello! I'm your AI assistant. How can I help you today?" }
        ]
    }
];
let currentChatId = chats[0].id;
let theme = localStorage.getItem('theme') || 'dark';
let loading = false;

// --- DOM ELEMENTS ---
const elements = {
    sidebar: document.getElementById('sidebar'),
    sidebarBackdrop: document.getElementById('sidebar-backdrop'),
    openSidebarBtn: document.getElementById('open-sidebar'),
    closeSidebarBtn: document.getElementById('close-sidebar'),
    themeToggleBtn: document.getElementById('theme-toggle'),
    sunIcon: document.getElementById('theme-sun-icon'),
    moonIcon: document.getElementById('theme-moon-icon'),
    newChatBtn: document.getElementById('new-chat-btn'),
    chatsList: document.getElementById('chats-list'),
    messagesContainer: document.getElementById('messages-container'),
    chatForm: document.getElementById('chat-form'),
    chatTextarea: document.getElementById('chat-textarea'),
    sendBtn: document.getElementById('send-btn'),
};

// --- INITIALIZATION ---
function init() {
    applyTheme();
    renderChats();
    renderPage();
    setupEventListeners();
    checkEnvironment();
    document.body.classList.add('ready');
    lucide.createIcons();
}

function checkEnvironment() {
    if (window.location.protocol === 'file:') {
        const warning = document.createElement('div');
        warning.className = "fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-orange-500 text-white px-6 py-3 rounded-xl shadow-2xl text-md font-bold animate-bounce text-center border-2 border-white";
        warning.innerHTML = `
            <div class="mb-1">⚠️ Local File Access Blocked</div>
            <div class="text-sm font-normal">Please use this link instead:</div>
            <div class="bg-white/20 px-2 py-1 rounded mt-1 select-all cursor-pointer">http://localhost:3030</div>
        `;
        document.body.appendChild(warning);
        // Don't auto-remove, keep it until they switch
    }
}

function applyTheme() {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        elements.sunIcon.classList.remove('hidden');
        elements.moonIcon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        elements.sunIcon.classList.add('hidden');
        elements.moonIcon.classList.remove('hidden');
    }
}

function saveState() {
    localStorage.setItem('chats', JSON.stringify(chats));
    localStorage.setItem('theme', theme);
}

// --- RENDERING ---
function renderChats() {
    elements.chatsList.innerHTML = '';
    chats.forEach(chat => {
        const isActive = chat.id === currentChatId;
        const chatItem = document.createElement('div');
        chatItem.className = `group flex items-center justify-center w-full gap-3 h-[40px] px-3 rounded-xl cursor-pointer transition-all ${isActive ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)]'}`;
        
        chatItem.onclick = () => {
            currentChatId = chat.id;
            renderChats();
            renderPage();
            if (window.innerWidth < 1024) toggleSidebar(false);
        };

        chatItem.innerHTML = `
            <i data-lucide="message-square" style="width: 16px; height: 16px;"></i>
            <span class="flex-1 truncate text-sm font-medium">${chat.title}</span>
            <button class="delete-chat-btn opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity" data-id="${chat.id}">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
        `;
        elements.chatsList.appendChild(chatItem);
    });

    lucide.createIcons();

    document.querySelectorAll('.delete-chat-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            deleteChat(parseInt(btn.dataset.id));
        };
    });
}

function renderPage() {
    const activeChat = chats.find(c => c.id === currentChatId) || chats[0];
    elements.messagesContainer.innerHTML = '';

    const isInitial = activeChat.messages.length === 1 && activeChat.messages[0].role === 'bot';

    if (isInitial) {
        elements.messagesContainer.className = "flex-1 overflow-y-auto px-4 md:px-8 scroll-smooth flex flex-col items-center justify-center pt-8 pb-6 md:pb-8";
        elements.messagesContainer.innerHTML = `
            <div class="w-full max-w-4xl flex flex-col items-center justify-center text-center fade-in">
                <i data-lucide="bot" style="width: 64px; height: 64px;" class="text-indigo-600 dark:text-indigo-400 mb-6"></i>
                <h1 class="text-3xl md:text-4xl font-bold mb-4">
                    ${activeChat.messages[0].text}
                </h1>
            </div>
        `;
    } else {
        elements.messagesContainer.className = "flex-1 overflow-y-auto px-4 md:px-8 scroll-smooth flex flex-col items-center pt-8 pb-6 md:pb-8";
        const msgWrapper = document.createElement('div');
        msgWrapper.className = "w-full max-w-4xl mx-auto flex flex-col gap-6 md:gap-8";

        activeChat.messages.forEach(msg => {
            const msgRow = document.createElement('div');
            msgRow.className = `flex gap-4 md:gap-6 fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`;

            const iconBg = msg.role === 'user' ? 'bg-indigo-600' : 'bg-[var(--msg-bot-bg)] border border-[var(--border-color)]';
            const iconColor = msg.role === 'user' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400';
            const iconName = msg.role === 'user' ? 'user' : 'bot';
            const bubbleClass = msg.role === 'user' ? 'message-user text-white' : 'message-bot text-[var(--text-primary)]';

            let content = '';
            if (msg.role === 'bot') {
                content = `<div class="prose max-w-none">${marked.parse(msg.text)}</div>`;
            } else {
                content = `<p class="whitespace-pre-wrap">${escapeHtml(msg.text)}</p>`;
            }

            msgRow.innerHTML = `
                <div class="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0 shadow-lg ${iconBg}">
                    <i data-lucide="${iconName}" style="width: 18px; height: 18px;" class="${iconColor}"></i>
                </div>
                <div class="message-bubble ${bubbleClass}">
                    ${content}
                </div>
            `;
            msgWrapper.appendChild(msgRow);
        });

        if (loading) {
            const loaderRow = document.createElement('div');
            loaderRow.className = "flex gap-4 md:gap-6 fade-in";
            loaderRow.innerHTML = `
                <div class="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-[var(--msg-bot-bg)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
                    <i data-lucide="bot" style="width: 18px; height: 18px;" class="text-indigo-600 dark:text-indigo-400"></i>
                </div>
                <div class="message-bot message-bubble flex items-center gap-3">
                    <i data-lucide="loader-2" class="animate-spin text-indigo-600 dark:text-indigo-400" style="width: 18px; height: 18px;"></i>
                    <span class="text-sm text-[var(--text-secondary)] font-medium">AI is crafting response...</span>
                </div>
            `;
            msgWrapper.appendChild(loaderRow);
        }

        elements.messagesContainer.appendChild(msgWrapper);
    }

    lucide.createIcons();
    scrollToBottom();
}

// --- HELPERS ---
function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function toggleSidebar(open) {
    if (open) {
        elements.sidebar.classList.remove('-translate-x-full');
        elements.sidebarBackdrop.classList.remove('hidden');
    } else {
        elements.sidebar.classList.add('-translate-x-full');
        elements.sidebarBackdrop.classList.add('hidden');
    }
}

// --- LOGIC ---
function createNewChat() {
    const newId = Date.now();
    const newChat = {
        id: newId,
        title: 'New Chat',
        messages: [{ role: 'bot', text: 'Started a new conversation. How can I assist?' }]
    };
    chats = [newChat, ...chats];
    currentChatId = newId;
    saveState();
    renderChats();
    renderPage();
}

function deleteChat(id) {
    chats = chats.filter(c => c.id !== id);
    if (chats.length === 0) {
        createNewChat();
    } else {
        if (id === currentChatId) currentChatId = chats[0].id;
        saveState();
        renderChats();
        renderPage();
    }
}

async function handleSend(e) {
    if (e) e.preventDefault();
    const query = elements.chatTextarea.value.trim();
    if (!query || loading) return;

    const activeChat = chats.find(c => c.id === currentChatId);
    if (!activeChat) return;

    const userMsg = { role: 'user', text: query };

    // Update state immediately
    activeChat.messages.push(userMsg);
    if (activeChat.title === 'New Chat') {
        activeChat.title = query.slice(0, 30) + (query.length > 30 ? '...' : '');
    }

    elements.chatTextarea.value = '';
    elements.chatTextarea.style.height = 'auto';
    loading = true;
    renderPage();
    renderChats();

    try {
        // Construct history for Gemini
        const firstUserIndex = activeChat.messages.findIndex(m => m.role === 'user');
        const historyMessages = activeChat.messages.slice(firstUserIndex, -1);
        
        const contents = historyMessages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
        }));
        
        contents.push({
            role: 'user',
            parts: [{ text: query }]
        });

        // Use v1 with fallback logic
        let response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents }),
        });

        let data = await response.json();
        
        // Fallback to v1beta if v1 fails for any reason
        if (data.error && data.error.code === 404) {
            console.warn("Retrying with v1beta...");
            const v1betaUrl = API_URL.replace('/v1/', '/v1beta/');
            response = await fetch(v1betaUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents }),
            });
            data = await response.json();
        }

        if (data.candidates && data.candidates[0].content) {
            const botResponse = data.candidates[0].content.parts[0].text;
            activeChat.messages.push({ role: 'bot', text: botResponse });
        } else if (data.error) {
            throw new Error(data.error.message || "API Error");
        } else {
            console.error("Unexpected API Response:", data);
            throw new Error("Invalid response format from AI.");
        }
    } catch (err) {
        console.error("Chat Error:", err);
        let errorMsg = err.message || "Failed to reach AI.";
        if (errorMsg === "Failed to fetch" && window.location.protocol === 'file:') {
            errorMsg = "Browser blocked the request because you are running from a local file (file://). Please use a local server.";
        }
        activeChat.messages.push({ role: 'bot', text: `⚠️ **Error:** ${errorMsg}` });
    } finally {
        loading = false;
        saveState();
        renderPage();
    }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    elements.themeToggleBtn.onclick = () => {
        theme = theme === 'dark' ? 'light' : 'dark';
        applyTheme();
        saveState();
    };

    elements.newChatBtn.onclick = createNewChat;
    elements.openSidebarBtn.onclick = () => toggleSidebar(true);
    elements.closeSidebarBtn.onclick = () => toggleSidebar(false);
    elements.sidebarBackdrop.onclick = () => toggleSidebar(false);

    elements.chatForm.onsubmit = handleSend;

    elements.chatTextarea.oninput = function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.scrollHeight > 200) this.style.overflowY = 'auto';
        else this.style.overflowY = 'hidden';
    };

    elements.chatTextarea.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    window.onresize = () => {
        if (window.innerWidth >= 1024) {
            elements.sidebar.classList.remove('-translate-x-full');
            elements.sidebarBackdrop.classList.add('hidden');
        } else if (!elements.sidebar.classList.contains('-translate-x-full')) {
            elements.sidebarBackdrop.classList.remove('hidden');
        }
    };
}

// --- START ---
init();
