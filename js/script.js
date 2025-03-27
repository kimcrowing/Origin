// DOM元素
const chatInput = document.getElementById('chat-input');
const messagesContainer = document.getElementById('messages');
const submitBtn = document.querySelector('.submit-btn');
const thinkBtn = document.querySelector('.think-btn');
const searchBtn = document.querySelector('.search-btn');
const userMenuBtn = document.getElementById('user-menu-btn');
const userMenu = document.getElementById('user-menu');
const attachmentBtn = document.getElementById('attachment-btn');
const fileInput = document.getElementById('file-input');
const historyMenuBtn = document.getElementById('history-menu-btn');
const historyMenu = document.getElementById('history-menu');
const historyList = document.getElementById('history-list');
const historySearchInput = document.querySelector('.history-search-input');
const newChatBtn = document.querySelector('.fa-edit').closest('.header-btn');
const deepSearchToggle = document.getElementById('deep-search-toggle') || { checked: false };
const streamToggle = document.getElementById('stream-toggle') || { checked: true };
const thinkToggle = document.getElementById('think-toggle') || { checked: false };
const modelSelector = document.querySelector('.model-selector');

// 用户登录状态管理
let currentUser = null;
const USER_KEY = 'origin_current_user';

// 消息模板
const aiMessageTemplate = document.getElementById('ai-message-template');
const userMessageTemplate = document.getElementById('user-message-template');
const thinkingTemplate = document.getElementById('thinking-indicator-template');

// 聊天历史和会话管理
let chatHistory = [];
let currentThinkingIndicator = null;
let currentFile = null;
let sessions = [];
let currentSessionId = null;

// 当前所选模型
let currentModel = 'deepseek/deepseek-r1:free';

// 专利答审提示词
const PATENT_RESPONSE_PROMPT = `你是一位专业的专利代理人，请根据审查意见通知书的内容，帮助申请人准备专利答复意见。请按照以下步骤进行：

1. 仔细分析审查意见通知书中的每个审查意见
2. 针对每个审查意见，提供详细的答复策略
3. 准备修改建议和修改后的权利要求书
4. 提供完整的答复意见书

请确保答复意见：
- 符合专利法及实施细则的规定
- 逻辑清晰，论述充分
- 引用相关法条和审查指南
- 提供具体的修改建议

请开始分析审查意见通知书并提供答复意见。`;

// 初始化函数
function init() {
    // 检查用户登录状态
    checkUserLoginStatus();
    
    // 计算并设置滚动条宽度
    setScrollbarWidthVariable();
    
    // 更新用户界面
    updateUserMenuButton();
    updateUserUI();
    
    // 设置提交按钮点击事件
    submitBtn.addEventListener('click', function(e) {
        handleSubmit(e);
    });
    
    // 设置输入框按键事件（Enter键发送）
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    });
    
    // Think按钮点击事件
    thinkBtn.addEventListener('click', function(e) {
        if (chatInput.value.trim()) {
            // 创建一个合成事件对象，确保handleSubmit函数可以正常工作
            const syntheticEvent = {
                preventDefault: function() {}
            };
            // 直接设置模式为think
            thinkToggle.checked = true;
            handleSubmit(syntheticEvent);
        }
    });
    
    // 附件按钮点击事件
    attachmentBtn.addEventListener('click', function() {
        fileInput.click();
    });
    
    // 新建对话按钮点击事件
    newChatBtn.addEventListener('click', function() {
        createNewSession('新对话');
    });
    
    // 初始化模型选择器
    initModelSelector();
    
    // 文件选择事件 - 使用内联函数定义，避免引用未定义的handleFileUpload
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // 保存当前文件对象
        currentFile = file;
        
        // 获取文件类型和大小
        const fileType = file.type || getFileTypeFromName(file.name);
        const fileSize = formatFileSize(file.size);
        
        // 显示文件已选择
        attachmentBtn.classList.add('active');
        
        // 添加用户上传文件的消息
        const fileMessage = `上传文件: ${file.name} (${fileSize})`;
        addMessageToUI(fileMessage, 'user');
        
        // 显示思考动画
        showThinkingIndicator();
        
        // 根据文件类型处理文件
        setTimeout(() => {
            processFile(file);
        }, 1000);
        
        // 清空文件输入，以便可以再次选择同一文件
        fileInput.value = '';
    });
    
    // 自动调整输入框高度
    chatInput.addEventListener('input', autoResizeTextarea);
    
    // 设置输入框自动聚焦
    chatInput.focus();
    
    // 初始化时调整一次高度
    autoResizeTextarea();
    
    // 为按钮添加悬停效果
    addButtonHoverEffects();
    
    // 用户菜单点击事件
    initUserMenu();
    
    // 历史会话菜单点击事件
    initHistoryMenu();
    
    // 添加主题切换按钮
    addThemeToggle();
    
    // 初始化主题
    initTheme();
    
    // 加载所有会话
    loadSessions();
    
    // 如果没有会话或没有设置当前会话ID，创建一个新会话
    if (sessions.length === 0 || !currentSessionId) {
        createNewSession('新对话');
    } else {
        // 加载当前会话
        loadCurrentSession();
    }
    
    // 显示登录状态相关的欢迎消息
    showWelcomeMessage();
    
    // 添加复制功能给所有现有消息
    addCopyButtonsToMessages();
    
    // 复制按钮事件委托
    document.addEventListener('click', handleCopyButtonClick);
}

// 初始化历史会话菜单
function initHistoryMenu() {
    // 点击历史会话按钮显示/隐藏菜单
    historyMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        historyMenu.classList.toggle('active');
        
        // 如果菜单正在显示，更新会话列表
        if (historyMenu.classList.contains('active')) {
            renderSessionList();
        }
    });
    
    // 搜索输入事件
    historySearchInput.addEventListener('input', function() {
        renderSessionList(this.value.trim().toLowerCase());
    });
    
    // 点击页面其他地方关闭菜单
    document.addEventListener('click', function(e) {
        if (!historyMenu.contains(e.target) && e.target !== historyMenuBtn) {
            historyMenu.classList.remove('active');
        }
    });
    
    // 会话项点击事件委托
    historyList.addEventListener('click', function(e) {
        const target = e.target;
        
        // 处理删除按钮点击
        if (target.closest('.delete-btn')) {
            e.stopPropagation();
            const sessionItem = target.closest('.history-item');
            const sessionId = sessionItem.getAttribute('data-id');
            deleteSession(sessionId);
            return;
        }
        
        // 处理重命名按钮点击
        if (target.closest('.rename-btn')) {
            e.stopPropagation();
            const sessionItem = target.closest('.history-item');
            const sessionId = sessionItem.getAttribute('data-id');
            startRenameSession(sessionItem, sessionId);
            return;
        }
        
        // 处理会话项点击（切换会话）
        const sessionItem = target.closest('.history-item');
        if (sessionItem) {
            const sessionId = sessionItem.getAttribute('data-id');
            switchSession(sessionId);
            historyMenu.classList.remove('active');
        }
    });
}

// 加载所有会话
function loadSessions() {
    // 尝试从localStorage加载会话
    const savedSessions = localStorage.getItem('chatSessions');
    const currentId = localStorage.getItem('currentSessionId');
    
    if (savedSessions) {
        sessions = JSON.parse(savedSessions);
        // 确保会话有正确的日期对象
        sessions.forEach(session => {
            if (typeof session.lastUpdated === 'string') {
                session.lastUpdated = new Date(session.lastUpdated);
            }
        });
    }
    
    // 设置当前会话ID
    if (currentId && sessions.some(session => session.id === currentId)) {
        currentSessionId = currentId;
    } else if (sessions.length > 0) {
        // 如果没有有效的当前会话ID，使用最新的会话
        sessions.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
        currentSessionId = sessions[0].id;
    }
}

// 加载当前会话
function loadCurrentSession() {
    // 找到当前会话
    const currentSession = sessions.find(session => session.id === currentSessionId);
    
    if (currentSession) {
        // 加载会话历史
        chatHistory = currentSession.messages || [];
        
        // 显示会话消息
        displaySessionMessages();
        
        // 更新页面标题
        document.title = `${currentSession.title} - Origin`;
    } else {
        // 如果找不到当前会话，创建一个新的
        createNewSession('新对话');
    }
}

// 显示会话消息
function displaySessionMessages() {
    // 清空消息容器
    messagesContainer.innerHTML = '';
    
    // 添加所有消息到UI
    chatHistory.forEach(msg => {
        if (msg.sender === 'user') {
            const messageElement = userMessageTemplate.content.cloneNode(true);
            const messageContent = messageElement.querySelector('.message-content');
            messageContent.textContent = msg.content;
            
            const timeElement = messageElement.querySelector('.message-time');
            timeElement.textContent = formatSavedTime(msg.timestamp);
            
            messagesContainer.appendChild(messageElement);
        } else {
            const messageElement = aiMessageTemplate.content.cloneNode(true);
            const messageContent = messageElement.querySelector('.message-content');
            messageContent.innerHTML = formatMessage(msg.content);
            
            const timeElement = messageElement.querySelector('.message-time');
            timeElement.textContent = formatSavedTime(msg.timestamp);
            
            // 将消息元素添加到UI
            messagesContainer.appendChild(messageElement);
        }
    });
    
    // 滚动到底部
    scrollToBottom();
    
    // 注意：现在不在这里为消息添加复制按钮，而是在加载完成后单独调用
    // addCopyButtonsToMessages();
}

// 渲染会话列表
function renderSessionList(searchTerm = '') {
    // 清空列表
    historyList.innerHTML = '';
    
    if (sessions.length === 0) {
        historyList.innerHTML = '<div class="empty-history">暂无历史会话</div>';
        return;
    }
    
    // 按最后更新时间排序（最新的在前）
    const sortedSessions = [...sessions].sort((a, b) => 
        new Date(b.lastUpdated) - new Date(a.lastUpdated)
    );
    
    // 过滤会话（如果有搜索词）
    const filteredSessions = searchTerm ? 
        sortedSessions.filter(session => 
            session.title.toLowerCase().includes(searchTerm) || 
            (session.messages && session.messages.some(msg => 
                msg.content.toLowerCase().includes(searchTerm)
            ))
        ) : 
        sortedSessions;
    
    // 如果没有匹配的会话
    if (filteredSessions.length === 0) {
        historyList.innerHTML = '<div class="empty-history">没有找到匹配的会话</div>';
        return;
    }
    
    // 创建会话项
    filteredSessions.forEach(session => {
        const sessionItem = document.createElement('div');
        sessionItem.className = 'history-item';
        sessionItem.setAttribute('data-id', session.id);
        
        // 如果是当前会话，添加active类
        if (session.id === currentSessionId) {
            sessionItem.classList.add('active');
        }
        
        // 计算上次更新时间显示
        const lastUpdatedDisplay = formatSessionTime(session.lastUpdated);
        
        // 获取第一条消息作为预览（如果有）
        let previewText = '空对话';
        if (session.messages && session.messages.length > 0) {
            const firstUserMessage = session.messages.find(msg => msg.sender === 'user');
            if (firstUserMessage) {
                previewText = firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
            }
        }
        
        sessionItem.innerHTML = `
            <i class="fas fa-comment history-item-icon"></i>
            <div class="history-item-content">
                <div class="history-item-title">${escapeHtml(session.title)}</div>
                <div class="history-item-time">${lastUpdatedDisplay} · ${escapeHtml(previewText)}</div>
            </div>
            <div class="history-item-actions">
                <button class="history-action-btn rename-btn" title="重命名">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="history-action-btn delete-btn" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        historyList.appendChild(sessionItem);
    });
}

// 格式化会话时间
function formatSessionTime(date) {
    if (!date) return '';
    
    // 确保日期是Date对象
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const now = new Date();
    const diff = now - dateObj;
    const day = 24 * 60 * 60 * 1000;
    
    // 如果是今天
    if (diff < day && dateObj.getDate() === now.getDate()) {
        return `今天 ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // 如果是昨天
    if (diff < 2 * day && dateObj.getDate() === now.getDate() - 1) {
        return `昨天 ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // 如果是本周
    if (diff < 7 * day) {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return `${days[dateObj.getDay()]} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // 其他情况显示完整日期
    return `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
}

// 创建新会话
function createNewSession(title) {
    // 生成唯一ID
    const sessionId = 'session_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // 创建新会话对象
    const newSession = {
        id: sessionId,
        title: title,
        messages: [],
        lastUpdated: new Date()
    };
    
    // 添加到会话列表
    sessions.push(newSession);
    
    // 设置为当前会话
    currentSessionId = sessionId;
    
    // 清空当前聊天历史
    chatHistory = [];
    messagesContainer.innerHTML = '';
    
    // 保存会话列表
    saveSessions();
    
    // 更新页面标题
    document.title = `${title} - Origin`;
    
    // 添加欢迎消息
    showWelcomeMessage();
    
    // 更新会话列表显示
    renderSessionList();
}

// 切换会话
function switchSession(sessionId) {
    // 保存当前会话
    saveCurrentSession();
    
    // 设置新的当前会话ID
    currentSessionId = sessionId;
    localStorage.setItem('currentSessionId', sessionId);
    
    // 加载新会话
    loadCurrentSession();
    
    // 更新会话列表显示
    renderSessionList();
}

// 开始重命名会话
function startRenameSession(sessionItem, sessionId) {
    // 获取当前标题
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // 获取标题元素并隐藏
    const titleElement = sessionItem.querySelector('.history-item-title');
    if (!titleElement) return;
    
    const currentTitle = titleElement.textContent;
    titleElement.style.display = 'none';
    
    // 创建输入框
    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.className = 'rename-input';
    inputEl.value = currentTitle;
    inputEl.setAttribute('data-original', currentTitle);
    
    // 插入输入框
    titleElement.parentNode.insertBefore(inputEl, titleElement);
    
    // 自动聚焦
    inputEl.focus();
    inputEl.select();
    
    // 处理输入框事件
    inputEl.addEventListener('keydown', function(e) {
        // 按Enter提交
        if (e.key === 'Enter') {
            e.preventDefault();
            const newTitle = this.value.trim();
            if (newTitle) {
                renameSession(sessionId, newTitle);
            }
            finishRename(this, titleElement, session.title);
        }
        
        // 按Esc取消
        if (e.key === 'Escape') {
            e.preventDefault();
            finishRename(this, titleElement, currentTitle);
        }
    });
    
    // 点击外部完成重命名
    inputEl.addEventListener('blur', function() {
        const newTitle = this.value.trim();
        if (newTitle && newTitle !== this.getAttribute('data-original')) {
            renameSession(sessionId, newTitle);
        }
        finishRename(this, titleElement, session.title);
    });
    
    // 阻止事件冒泡
    inputEl.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// 完成重命名（清理UI）
function finishRename(inputEl, titleElement, finalTitle) {
    // 更新标题显示
    titleElement.textContent = finalTitle;
    
    // 移除输入框并显示标题
    inputEl.remove();
    titleElement.style.display = '';
}

// 重命名会话
function renameSession(sessionId, newTitle) {
    // 查找会话并更新标题
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
        session.title = newTitle;
        
        // 如果是当前会话，更新页面标题
        if (sessionId === currentSessionId) {
            document.title = `${newTitle} - Origin`;
        }
        
        // 保存会话列表
        saveSessions();
    }
}

// 删除会话
function deleteSession(sessionId) {
    // 确认删除
    if (!confirm('确定要删除此会话吗？此操作不可恢复。')) {
        return;
    }
    
    // 查找会话索引
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return;
    
    // 删除会话
    sessions.splice(sessionIndex, 1);
    
    // 如果删除的是当前会话，切换到另一个会话或创建新会话
    if (sessionId === currentSessionId) {
        if (sessions.length > 0) {
            // 按最后更新时间排序
            sessions.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
            // 切换到最新的会话
            switchSession(sessions[0].id);
        } else {
            // 如果没有会话了，创建新会话
            createNewSession('新对话');
        }
    }
    
    // 保存会话列表
    saveSessions();
    
    // 更新会话列表显示
    renderSessionList();
}

// 保存当前会话
function saveCurrentSession() {
    // 查找当前会话
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;
    
    // 更新会话消息和最后更新时间
    session.messages = [...chatHistory];
    session.lastUpdated = new Date();
    
    // 生成更好的标题（如果是默认标题且有消息）
    if (session.title === '新对话' && chatHistory.length > 0) {
        // 尝试使用第一条用户消息作为标题
        const firstUserMessage = chatHistory.find(msg => msg.sender === 'user');
        if (firstUserMessage) {
            // 截取前20个字符作为标题
            let newTitle = firstUserMessage.content.substring(0, 20);
            if (firstUserMessage.content.length > 20) {
                newTitle += '...';
            }
            session.title = newTitle;
            
            // 更新页面标题
            document.title = `${newTitle} - Origin`;
        }
    }
    
    // 保存会话列表
    saveSessions();
}

// 保存所有会话
function saveSessions() {
    localStorage.setItem('chatSessions', JSON.stringify(sessions));
    localStorage.setItem('currentSessionId', currentSessionId);
}

// 显示欢迎消息
function showWelcomeMessage() {
    // 根据登录状态显示不同的欢迎消息
    if ((!authService || !authService.isLoggedIn) && !currentUser) {
        // 未登录状态，显示登录提示
        const welcomeMessage = `# 欢迎使用 Origin AI

感谢您使用我们的AI对话平台！

**请注意：** 您当前未登录，需要登录后才能使用AI对话功能。

请点击右上角的"登录"按钮进行登录，或者注册一个新账号。

如有任何问题，请随时联系我们的客服。`;
        addMessageToUI(formatMarkdown(welcomeMessage), 'ai');
    } else {
        // 已登录状态，显示欢迎消息
        const user = currentUser || authService.getCurrentUser();
        const welcomeMessage = `# 欢迎回来，${user.name}！

您已成功登录，可以开始与AI助手对话了。

有什么我能帮您解答的问题吗？`;
        addMessageToUI(formatMarkdown(welcomeMessage), 'ai');
    }
    
    // 保存当前会话
    saveCurrentSession();
}

// 自动调整输入框高度
function autoResizeTextarea() {
    // 保持最小高度为44px
    const minHeight = 44;
    
    // 设置高度为自动，让浏览器计算实际内容高度
    chatInput.style.height = 'auto';
    
    // 如果内容高度小于最小高度，则使用最小高度
    const newHeight = Math.max(minHeight, Math.min(chatInput.scrollHeight, 200));
    chatInput.style.height = newHeight + 'px';
}

// 重置输入框高度到初始状态
function resetTextareaHeight() {
    // 设置回最小高度 44px
    chatInput.style.height = '44px';
}

// 添加按钮悬停效果
function addButtonHoverEffects() {
    const buttons = document.querySelectorAll('.search-btn, .think-btn, .model-selector, .submit-btn');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-1px)';
            this.style.transition = 'transform 0.2s ease';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// 添加主题切换按钮
function addThemeToggle() {
    // 创建主题切换按钮
    const themeToggleBtn = document.createElement('button');
    themeToggleBtn.className = 'header-btn theme-toggle';
    themeToggleBtn.title = '切换主题';
    themeToggleBtn.id = 'theme-toggle';
    
    // 添加图标
    const isDarkTheme = document.body.classList.contains('light-theme') ? false : true;
    themeToggleBtn.innerHTML = `
        <i class="fas ${isDarkTheme ? 'fa-sun' : 'fa-moon'}" aria-hidden="true"></i>
        <span class="sr-only">切换主题</span>
    `;
    
    // 添加到头部导航
    const headerActions = document.querySelector('.header-actions');
    headerActions.insertBefore(themeToggleBtn, headerActions.firstChild);
    
    // 添加点击事件
    themeToggleBtn.addEventListener('click', toggleTheme);
}

// 初始化主题
function initTheme() {
    // 检查localStorage中是否有保存的主题
    const savedTheme = localStorage.getItem('theme');
    
    // 强制为所有设备应用相同的主题逻辑
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        document.documentElement.classList.add('light-theme');
    } else if (savedTheme === 'dark' || savedTheme === null) {
        // 默认使用暗色主题（如果没有明确保存过主题）
        document.body.classList.remove('light-theme');
        document.documentElement.classList.remove('light-theme');
        // 添加强制暗色主题标记
        document.documentElement.classList.add('dark-theme-enforced');
    } else {
        // 如果没有保存的主题，则使用系统主题
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
        if (!prefersDarkScheme.matches) {
            document.body.classList.add('light-theme');
            document.documentElement.classList.add('light-theme');
        } else {
            // 确保移除浅色主题
            document.body.classList.remove('light-theme');
            document.documentElement.classList.remove('light-theme');
            // 添加强制暗色主题标记
            document.documentElement.classList.add('dark-theme-enforced');
        }
    }
    
    // 更新主题切换按钮图标
    updateThemeToggleIcon();
}

// 切换主题
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    document.documentElement.classList.toggle('light-theme');
    
    // 处理强制暗色主题标记
    if (document.body.classList.contains('light-theme')) {
        document.documentElement.classList.remove('dark-theme-enforced');
    } else {
        document.documentElement.classList.add('dark-theme-enforced');
    }
    
    // 保存主题到localStorage
    const isLightTheme = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLightTheme ? 'light' : 'dark');
    
    // 更新图标
    updateThemeToggleIcon();
}

// 更新主题切换按钮图标
function updateThemeToggleIcon() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;
    
    const isLightTheme = document.body.classList.contains('light-theme');
    const icon = themeToggleBtn.querySelector('i');
    
    if (icon) {
        icon.className = isLightTheme ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// 初始化用户菜单
function initUserMenu() {
    // 使用auth.js中的authService
    updateUserMenuButton();
    
    // 确保移除旧的事件监听器
    userMenuBtn.removeEventListener('click', handleUserMenuClick);
    // 为用户按钮添加点击事件
    userMenuBtn.addEventListener('click', handleUserMenuClick);
    
    // 为菜单项添加点击事件
    userMenu.addEventListener('click', function(e) {
        const menuItem = e.target.closest('.menu-item');
        if (!menuItem) return;
        
        const action = menuItem.textContent.trim();
        handleMenuAction(action);
        
        // 隐藏菜单
        hideUserMenu();
    });
    
    // 点击其他区域关闭菜单
    document.addEventListener('click', function(e) {
        if (!userMenuBtn.contains(e.target) && !userMenu.contains(e.target)) {
            hideUserMenu();
        }
    });
}

// 更新用户菜单按钮显示
function updateUserMenuButton() {
    if ((authService && authService.isLoggedIn) || currentUser) {
        const user = currentUser || authService.getCurrentUser();
        if (user) {
            userMenuBtn.textContent = user.initials || 'U';
            userMenuBtn.title = `${user.name} (${user.email})`;
        }
    } else {
        userMenuBtn.textContent = '登录';
        userMenuBtn.title = '点击登录';
    }
}

// 用户菜单按钮点击事件处理
function handleUserMenuClick(e) {
    e.stopPropagation(); // 阻止事件冒泡
    
    if ((!authService || !authService.isLoggedIn) && !currentUser) {
        // 未登录，显示登录框
        showLoginModal();
        return;
    }
    
    // 切换菜单显示状态
    toggleUserMenu();
}

// 切换用户菜单显示状态
function toggleUserMenu() {
    // 强制添加active类
    if (!userMenu.classList.contains('active')) {
        showUserMenu();
    } else {
        hideUserMenu();
    }
}

// 显示用户菜单
function showUserMenu() {
    userMenu.style.display = 'block';
    setTimeout(() => {
        userMenu.classList.add('active');
    }, 10);
}

// 隐藏用户菜单
function hideUserMenu() {
    userMenu.classList.remove('active');
    setTimeout(() => {
        userMenu.style.display = 'none';
    }, 200);
}

// 处理菜单操作
function handleMenuAction(action) {
    switch (action) {
        case 'Settings':
            // 处理设置操作
            addMessageToUI('Settings功能即将上线...', 'ai');
            break;
        case 'Help & Feedback':
            // 处理帮助与反馈操作
            const helpMessage = `# Origin AI 帮助指南

## 基本功能
- **对话**：直接输入问题或请求
- **DeepSearch**：开启深度搜索，获取更准确的信息
- **Think模式**：获取更深入的分析和推理

## 特殊命令
- **/clear**：清除当前对话历史
- **/help**：显示此帮助信息
- **/reset**：重置AI，开始新的对话

如有其他问题或反馈，请随时告诉我们！`;
            addMessageToUI(formatMarkdown(helpMessage), 'ai');
            break;
        case 'Sign Out':
            // 使用authService处理退出登录
            if (confirm('确定要退出登录吗？')) {
                authService.logout();
                // 退出后会自动刷新页面，所以不需要额外代码
            }
            break;
    }
}

// 处理提交操作
function handleSubmit(event) {
    // 防御性代码：确保event存在
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }
    
    // 检查用户是否已登录
    if ((!authService || !authService.isLoggedIn) && !currentUser) {
        // 显示登录提示信息
        addMessageToUI("请先登录后再使用AI对话功能。", "ai");
        // 显示登录弹窗
        showLoginModal();
        return;
    }
    
    // 获取用户输入
    const userMessage = chatInput.value.trim();
    
    // 如果输入为空，不处理
    if (!userMessage) return;
    
    // 检查是否是特殊命令
    if (userMessage.startsWith('/')) {
        if (handleSpecialCommand(userMessage)) {
            // 如果是已知命令，清空输入并返回
            chatInput.value = '';
            // 重置输入框高度
            resetTextareaHeight();
            return;
        }
    }
    
    // 添加用户消息到UI前禁用提交按钮
    submitBtn.disabled = true;
    submitBtn.classList.add('processing');
    submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
    
    // 添加用户消息到UI
    addMessageToUI(userMessage, 'user');
    
    // 清空输入框
    chatInput.value = '';
    
    // 重置输入框高度
    resetTextareaHeight();
    
    // 显示思考动画
    showThinkingIndicator();
    
    // 检查模式选择
    const isDeepSearchMode = deepSearchToggle.checked;
    const isStreamingMode = streamToggle.checked;
    const isThinkingMode = thinkToggle.checked;
    
    // 可以从event参数中获取是否是由Think按钮触发的
    let mode = isDeepSearchMode ? 'deep' : (isThinkingMode ? 'think' : 'chat');
    
    // 如果参数是字符串且是'think'，则覆盖模式为think
    if (typeof event === 'string' && event === 'think') {
        mode = 'think';
    }
    
    console.log('当前模式:', mode, '流式响应:', isStreamingMode);
    
    // 更新UI以反映当前模式
    updateModeIndicator(mode);
    
    // 设置一个超时，如果超过一定时间没有回复，显示等待提示
    const waitTimeout = setTimeout(() => {
        // 添加等待提示消息
        const waitingMessage = document.createElement('div');
        waitingMessage.className = 'waiting-message';
        waitingMessage.innerHTML = '<i class="fas fa-info-circle"></i>';
        waitingMessage.id = 'waiting-message';
        
        // 将提示添加到思考指示器之后
        if (currentThinkingIndicator) {
            const indicator = document.getElementById(currentThinkingIndicator);
            if (indicator) {
                indicator.insertAdjacentElement('afterend', waitingMessage);
                
                // 添加动画效果
                setTimeout(() => {
                    waitingMessage.style.opacity = '1';
                }, 10);
            }
        }
    }, 5000); // 5秒后显示等待提示
    
    // 根据模式和流式选项决定如何处理
    if (isStreamingMode) {
        // 使用流式响应
        streamAIResponse(userMessage, mode)
            .finally(() => {
                // 响应完成后，移除等待提示（如果有）
                clearTimeout(waitTimeout);
                const waitingMsg = document.getElementById('waiting-message');
                if (waitingMsg) {
                    waitingMsg.style.opacity = '0';
                    setTimeout(() => waitingMsg.remove(), 300);
                }
                
                // 恢复提交按钮
                submitBtn.disabled = false;
                submitBtn.classList.remove('processing');
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            });
    } else {
        // 使用普通响应
        generateAIResponse(userMessage, mode)
            .finally(() => {
                // 响应完成后，移除等待提示（如果有）
                clearTimeout(waitTimeout);
                const waitingMsg = document.getElementById('waiting-message');
                if (waitingMsg) {
                    waitingMsg.style.opacity = '0';
                    setTimeout(() => waitingMsg.remove(), 300);
                }
                
                // 恢复提交按钮
                submitBtn.disabled = false;
                submitBtn.classList.remove('processing');
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            });
    }
}

// 更新模式指示器
function updateModeIndicator(mode) {
    // 移除现有的模式指示器
    const existingIndicator = document.querySelector('.mode-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // 创建新的模式指示器
    const indicator = document.createElement('div');
    indicator.className = 'mode-indicator';
    
    // 根据模式设置不同的样式和文本
    switch (mode) {
        case 'deep':
            indicator.innerHTML = '<i class="fas fa-search-plus"></i> 深度搜索模式';
            indicator.classList.add('deep-mode');
            break;
        case 'think':
            indicator.innerHTML = '<i class="fas fa-brain"></i> 思考模式';
            indicator.classList.add('think-mode');
            break;
        default:
            indicator.innerHTML = '<i class="fas fa-comment"></i> 对话模式';
            indicator.classList.add('chat-mode');
    }
    
    // 添加到文档
    document.body.appendChild(indicator);
    
    // 显示指示器
    setTimeout(() => {
        indicator.classList.add('show');
    }, 10);
    
    // 2秒后自动隐藏
    setTimeout(() => {
        indicator.classList.remove('show');
        setTimeout(() => {
            indicator.remove();
        }, 300);
    }, 2000);
}

// 使用流式响应生成AI回复
async function streamAIResponse(userMessage, mode, model = null) {
    // 生成消息ID，用于防止重复添加
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建一个新的消息元素
    const messageElement = aiMessageTemplate.content.cloneNode(true);
    const messageWrapper = messageElement.querySelector('.message');
    const messageContent = messageElement.querySelector('.message-content');
    
    // 添加消息ID
    messageWrapper.setAttribute('data-message-id', messageId);
    
    // 初始化内容为空
    messageContent.innerHTML = '';
    
    // 设置时间戳
    const timeElement = messageElement.querySelector('.message-time');
    timeElement.textContent = getCurrentTime();
    
    // 移除思考指示器
    removeThinkingIndicator();
    
    // 将消息元素添加到UI
    messagesContainer.appendChild(messageElement);
    
    // 创建复制按钮
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = '<i class="fas fa-copy"></i><span class="copy-text">复制</span>';
    copyBtn.title = '复制内容';
    copyBtn.setAttribute('data-action', 'copy');
    
    // 创建进度指示器
    const progressIndicator = document.createElement('div');
    progressIndicator.className = 'response-progress';
    progressIndicator.innerHTML = `
        <div class="progress-bar">
            <div class="animation-dots">
                <span class="anim-dot"></span>
                <span class="anim-dot"></span>
                <span class="anim-dot"></span>
            </div>
        </div>
    `;
    messageContent.appendChild(progressIndicator);
    
    // 当前累积的响应文本
    let fullResponse = '';
    
    // 跟踪响应的各个部分
    const responseParts = [];
    
    // 保存思考过程（如果有）
    let thinkingProcess = '';
    let isThinking = mode === 'think';
    let showingThinking = false;
    
    // 创建思考过程显示区域
    let thinkingSection = null;
    if (isThinking) {
        thinkingSection = document.createElement('div');
        thinkingSection.className = 'thinking-process';
        thinkingSection.innerHTML = `
            <div class="thinking-header">
                <span class="thinking-title">思考过程</span>
                <button class="thinking-toggle">显示/隐藏</button>
            </div>
            <div class="thinking-content" style="display: none;"></div>
        `;
        messageContent.appendChild(thinkingSection);
        
        // 设置思考过程显示/隐藏切换
        const toggleBtn = thinkingSection.querySelector('.thinking-toggle');
        toggleBtn.addEventListener('click', () => {
            const content = thinkingSection.querySelector('.thinking-content');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                toggleBtn.textContent = '隐藏';
            } else {
                content.style.display = 'none';
                toggleBtn.textContent = '显示';
            }
        });
    }
    
    // 自动保存的interval ID
    let autoSaveInterval = null;
    
    // 设置自动保存
    const setupAutoSave = () => {
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
        }
        
        // 每5秒自动保存一次进度
        autoSaveInterval = setInterval(() => {
            // 保存当前进度到本地存储
            localStorage.setItem(`response_progress_${messageId}`, JSON.stringify({
                id: messageId,
                content: fullResponse,
                thinking: thinkingProcess,
                timestamp: Date.now(),
                completed: false
            }));
        }, 5000);
    };
    
    // 更新进度样式 - 简化后不再显示百分比
    const updateProgress = (percent) => {
        // 我们不再需要更新百分比，因为已经改为使用纯动画
        // 这个函数保留为空以支持现有的调用流程
        // 未来可以用它来更新动画状态或添加其他效果
    };
    
    // 提高进度更新频率，避免内存问题
    const progressUpdateInterval = 50; // 降低到50
    let lastProgressUpdate = 0;
    
    // 分批处理响应的最大长度
    const maxBatchLength = 10000;
    
    // 创建智能分段渲染函数
    const renderResponse = (content, isCompleted = false) => {
        try {
            console.log(`开始渲染内容，长度: ${content.length}字符，是否完成: ${isCompleted}`);
            
            // 始终保存原始内容到全局变量，方便调试
            window.lastFullResponse = content;
            
            // 完整内容始终保存到隐藏元素中，以便确保内容完整性
            if (isCompleted) {
                // 创建或获取隐藏的完整内容存储元素
                let fullContentStore = messageContent.querySelector('.full-content-store');
                if (!fullContentStore) {
                    fullContentStore = document.createElement('div');
                    fullContentStore.className = 'full-content-store';
                    fullContentStore.style.display = 'none';
                    messageContent.appendChild(fullContentStore);
                }
                
                // 存储完整的原始内容
                fullContentStore.textContent = content;
                
                // 清空当前内容
                messageContent.innerHTML = '';
                
                // 创建内容信息显示
                const contentInfo = document.createElement('div');
                contentInfo.className = 'content-info';
                contentInfo.innerHTML = `<span>总计 ${content.length} 个字符, ${content.split('\n').length} 行内容</span>`;
                messageContent.appendChild(contentInfo);
                
                // 使用超小块分段渲染方式确保显示完整
                const microChunkSize = 3000; // 小块大小
                const chunks = [];
                
                // 分割内容为多个小块
                for (let i = 0; i < content.length; i += microChunkSize) {
                    chunks.push(content.slice(i, i + microChunkSize));
                }
                
                console.log(`将内容分为 ${chunks.length} 个小块处理，确保完整显示`);
                
                // 创建内容包装器
                const contentWrapper = document.createElement('div');
                contentWrapper.className = 'complete-content-wrapper';
                
                // 处理每个块
                chunks.forEach((chunk, index) => {
                    try {
                        const chunkDiv = document.createElement('div');
                        chunkDiv.className = `content-chunk chunk-${index}`;
                        // 对每个块进行格式化
                        chunkDiv.innerHTML = formatMessage(chunk);
                        contentWrapper.appendChild(chunkDiv);
                    } catch (chunkError) {
                        // 如果格式化失败，使用基本的HTML转义显示纯文本
                        console.warn(`块${index}格式化失败，使用纯文本`, chunkError);
                        const fallbackDiv = document.createElement('div');
                        fallbackDiv.className = `content-chunk-fallback chunk-${index}`;
                        fallbackDiv.textContent = chunk; // 直接使用文本内容
                        contentWrapper.appendChild(fallbackDiv);
                    }
                });
                
                // 将包装容器添加到消息内容
                messageContent.appendChild(contentWrapper);
                
                // 添加锚点导航 (只在完成时添加) - 移除目录导航功能
                // addContentAnchors(messageContent);
                
                // 重新添加思考区域（如果存在）
                if (thinkingSection) {
                    messageContent.appendChild(thinkingSection);
                }
                
                // 添加复制按钮
                messageContent.appendChild(copyBtn);
            } else if (content.length > 30000) {
                // 长文本增量渲染：只显示最后的部分
                const displayLength = 10000;
                const displayContent = content.slice(-displayLength);
                messageContent.innerHTML = formatMessage(displayContent);
                
                // 添加提示信息
                const progressInfo = document.createElement('div');
                progressInfo.className = 'content-progress-info';
                progressInfo.innerHTML = `<span>正在接收长文本内容，已接收 ${content.length} 个字符...</span>`;
                messageContent.insertBefore(progressInfo, messageContent.firstChild);
                
                // 重新添加思考区域（如果存在）
                if (thinkingSection) {
                    messageContent.appendChild(thinkingSection);
                }
                
                // 添加复制按钮
                messageContent.appendChild(copyBtn);
                
                // 重新添加进度指示器
                if (progressIndicator) {
                    messageContent.appendChild(progressIndicator);
                }
            } else {
                // 标准长度文本渲染
                messageContent.innerHTML = formatMessage(content);
                
                // 重新添加思考区域（如果存在）
                if (thinkingSection) {
                    messageContent.appendChild(thinkingSection);
                }
                
                // 添加复制按钮
                messageContent.appendChild(copyBtn);
                
                // 添加进度指示器（如果未完成）
                if (!isCompleted && progressIndicator) {
                    messageContent.appendChild(progressIndicator);
                }
            }
        } catch (error) {
            console.error('渲染内容出错:', error);
            
            // 如果渲染失败，直接使用纯文本显示
            try {
                // 清空当前内容
                messageContent.innerHTML = '';
                
                // 创建内容信息显示
                const errorInfo = document.createElement('div');
                errorInfo.className = 'content-info';
                errorInfo.innerHTML = '<span>使用纯文本方式显示内容</span>';
                messageContent.appendChild(errorInfo);
                
                // 创建pre元素直接显示原始内容
                const preElement = document.createElement('pre');
                preElement.className = 'raw-content';
                preElement.textContent = content;
                messageContent.appendChild(preElement);
                
                // 重新添加思考区域（如果存在）
                if (thinkingSection) {
                    messageContent.appendChild(thinkingSection);
                }
                
                // 添加复制按钮
                messageContent.appendChild(copyBtn);
                
                // 添加进度指示器（如果未完成）
                if (!isCompleted && progressIndicator) {
                    messageContent.appendChild(progressIndicator);
                }
            } catch (e) {
                console.error('纯文本显示也失败:', e);
                messageContent.innerHTML = '<p class="error-message">渲染内容遇到问题。请刷新页面重试。</p>';
                
                // 在控制台提供原始内容
                console.log('--- 以下是完整回答内容 ---');
                console.log(content);
            }
        }
        
        // 滚动到底部
        scrollToBottom();
    };
    
    // 添加内容锚点导航 - 注释掉相关功能
    /*
    const addContentAnchors = (contentElement) => {
        // 查找标题元素
        const headings = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length < 2) return; // 少于2个标题不需要锚点
        
        // 创建锚点导航容器
        const anchorNav = document.createElement('div');
        anchorNav.className = 'anchor-navigation';
        anchorNav.innerHTML = '<div class="anchor-title">快速导航</div><div class="anchor-links"></div>';
        
        const linkContainer = anchorNav.querySelector('.anchor-links');
        
        // 为每个标题创建锚点
        headings.forEach((heading, index) => {
            const headingId = `heading-${messageId}-${index}`;
            heading.id = headingId;
            
            // 创建锚点链接
            const anchorLink = document.createElement('a');
            anchorLink.href = `#${headingId}`;
            anchorLink.className = `anchor-link level-${heading.tagName.toLowerCase()}`;
            anchorLink.textContent = heading.textContent.trim();
            
            // 添加点击事件
            anchorLink.addEventListener('click', (e) => {
                e.preventDefault();
                
                // 滚动到标题位置
                heading.scrollIntoView({behavior: 'smooth'});
                
                // 添加高亮效果
                heading.classList.add('highlight-heading');
                setTimeout(() => {
                    heading.classList.remove('highlight-heading');
                }, 2000);
            });
            
            linkContainer.appendChild(anchorLink);
        });
        
        // 添加到内容顶部
        contentElement.insertBefore(anchorNav, contentElement.firstChild);
    };
    */
    
    try {
        // 启动自动保存
        setupAutoSave();
        
        // 使用指定的模型
        await apiService.streamChatCompletion(
            userMessage,
            // 处理每个响应片段
            (chunk) => {
                if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
                    const delta = chunk.choices[0].delta;
                    
                    // 检查是否包含思考过程
                    if (isThinking && delta.thinking) {
                        thinkingProcess += delta.thinking;
                        
                        // 更新思考过程显示
                        if (thinkingSection) {
                            const thinkingContent = thinkingSection.querySelector('.thinking-content');
                            thinkingContent.innerHTML = formatMessage(thinkingProcess);
                            
                            if (!showingThinking) {
                                // 首次收到思考内容时显示思考区域
                                thinkingSection.style.display = 'block';
                                showingThinking = true;
                            }
                        }
                    }
                    
                    // 如果有内容增量，则添加到响应中
                    if (delta.content) {
                        const content = delta.content;
                        fullResponse += content;
                        responseParts.push(content);
                        
                        // 定期更新显示，减少频繁DOM操作
                        const now = Date.now();
                        if (now - lastProgressUpdate > progressUpdateInterval || fullResponse.length % 1000 === 0) {
                            lastProgressUpdate = now;
                            
                            // 使用优化的渲染函数
                            renderResponse(fullResponse);
                        }
                    }
                }
            },
            // 流式响应完成的回调
            () => {
                console.log('流式响应完成，消息ID:', messageId);
                
                // 在控制台显示完整的AI回答内容，方便用户对比查看
                console.log('%c完整AI回答内容 (ID: ' + messageId + '):', 'background:#4a7bff; color:white; padding:3px 6px; border-radius:3px; font-weight:bold;');
                console.log(fullResponse);
                
                // 统计字数和行数
                const charCount = fullResponse.length;
                const lineCount = fullResponse.split('\n').length;
                console.log(`%c回答统计: ${charCount} 字符, ${lineCount} 行`, 'color:#4a7bff; font-weight:bold;');
                
                // 清除自动保存
                if (autoSaveInterval) {
                    clearInterval(autoSaveInterval);
                    autoSaveInterval = null;
                }
                
                // 移除进度指示器
                if (progressIndicator.parentNode) {
                    progressIndicator.parentNode.removeChild(progressIndicator);
                }
                
                // 使用优化的渲染函数渲染完整内容
                renderResponse(fullResponse, true);
                
                // 确保历史记录中不重复添加相同的消息
                const existingMessage = chatHistory.find(msg => msg.id === messageId);
                if (!existingMessage) {
                    // 添加消息到历史记录
                    chatHistory.push({
                        id: messageId,
                        sender: 'ai',
                        content: fullResponse,
                        thinking: thinkingProcess,
                        timestamp: Date.now()
                    });
                    
                    // 保存当前会话
                    saveCurrentSession();
                    
                    // 删除临时进度存储
                    localStorage.removeItem(`response_progress_${messageId}`);
                }
                
                // 将完成的消息标记为已完成
                localStorage.setItem(`response_progress_${messageId}`, JSON.stringify({
                    id: messageId,
                    content: fullResponse,
                    thinking: thinkingProcess,
                    timestamp: Date.now(),
                    completed: true
                }));
            },
            (error) => {
                console.error('流式响应出错:', error);
                
                // 清除自动保存
                if (autoSaveInterval) {
                    clearInterval(autoSaveInterval);
                }
                
                // 移除进度指示器
                if (progressIndicator.parentNode) {
                    progressIndicator.parentNode.removeChild(progressIndicator);
                }
                
                // 如果有部分响应，显示部分响应和错误信息
                if (fullResponse) {
                    console.warn('中断前已接收内容长度:', fullResponse.length);
                    
                    // 使用优化的渲染函数渲染中断前的内容
                    renderResponse(fullResponse, true);
                    
                    // 添加错误提示
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'error-message';
                    errorMessage.textContent = `回答中断：${error.message}`;
                    messageContent.appendChild(errorMessage);
                } else {
                    messageContent.innerHTML = `<p class="error-message">错误: ${error.message}</p>`;
                }
                
                // 添加复制按钮
                messageContent.appendChild(copyBtn);
                
                // 确保历史记录中不重复添加相同的消息
                const existingMessage = chatHistory.find(msg => msg.id === messageId);
                if (!existingMessage && fullResponse) {
                    // 添加消息到历史记录，即使不完整
                    chatHistory.push({
                        id: messageId,
                        sender: 'ai',
                        content: fullResponse,
                        thinking: thinkingProcess,
                        timestamp: Date.now(),
                        error: error.message
                    });
                    
                    // 保存当前会话
                    saveCurrentSession();
                    
                    // 保存错误状态
                    localStorage.setItem(`response_progress_${messageId}`, JSON.stringify({
                        id: messageId,
                        content: fullResponse,
                        thinking: thinkingProcess,
                        timestamp: Date.now(),
                        error: error.message,
                        completed: false
                    }));
                }
            },
            model
        );
    } catch (error) {
        console.error('调用流式API时发生错误:', error);
        
        // 清除自动保存
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
        }
        
        // 显示错误消息
        messageContent.innerHTML = `
            <p class="error-message">发生错误: ${error.message}</p>
            <p>请稍后再试或刷新页面。</p>
        `;
        
        // 添加复制按钮
            messageContent.appendChild(copyBtn);
    }
}

// 格式化消息
function formatMessage(message) {
    // 检测是否包含代码块或markdown格式
    if (message.includes('```') || message.includes('#') || message.includes('*')) {
        return formatMarkdown(message);
    }
    
    // 处理普通文本的URL
    return message.replace(/https?:\/\/[^\s]+/g, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

// 格式化Markdown
function formatMarkdown(markdown) {
    if (!markdown) return '';
    
    // 保存代码块，防止内部被错误解析
    const codeBlocks = [];
    markdown = markdown.replace(/```(\w*)([\s\S]*?)```/g, (match, language, code) => {
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        // 添加data-language属性以便CSS可以显示语言标签
        codeBlocks.push(`<pre data-language="${language || ''}"><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>`);
        return placeholder;
    });
    
    // 保存行内代码
    const inlineCodes = [];
    markdown = markdown.replace(/`([^`]+)`/g, (match, code) => {
        const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
        inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
        return placeholder;
    });
    
    // 处理表格 - 改进表格处理逻辑
    const tableRows = [];
    let tableStarted = false;
    let tableHasHeader = false;
    
    // 先提取所有表格行
    const lines = markdown.split('\n');
    let processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 检测表格行
        if (/^\|(.+)\|$/.test(line)) {
            if (!tableStarted) {
                tableStarted = true;
                tableRows.push(line);
                
                // 检测下一行是否是分隔行
                if (i + 1 < lines.length && /^\|([-:\|\s]+)\|$/.test(lines[i+1]) && /^[\s\-:|]+$/.test(lines[i+1].replace(/^\||\|$/g, ''))) {
                    tableHasHeader = true;
                    tableRows.push(lines[i+1]);
                    i++; // 跳过分隔行
                }
            } else {
                tableRows.push(line);
            }
        } else {
            // 如果之前有表格，现在结束了
            if (tableStarted) {
    // 处理表格
                const tableHtml = processTable(tableRows, tableHasHeader);
                processedLines.push(tableHtml);
                
                // 重置表格状态
                tableRows.length = 0;
                tableStarted = false;
                tableHasHeader = false;
            }
            
            processedLines.push(line);
        }
    }
    
    // 处理可能在结尾的表格
    if (tableStarted && tableRows.length > 0) {
        const tableHtml = processTable(tableRows, tableHasHeader);
        processedLines.push(tableHtml);
    }
    
    markdown = processedLines.join('\n');
    
    // 处理图片 ![alt](src)
    markdown = markdown.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" loading="lazy">');
    
    // 处理链接 [text](url)
    markdown = markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // 处理引用块
    markdown = markdown.replace(/^>\s*(.*?)$/gm, '<blockquote>$1</blockquote>');
    // 合并相邻的引用块
    markdown = markdown.replace(/<\/blockquote>\s*<blockquote>/g, '<br>');
    
    // 处理水平线
    markdown = markdown.replace(/^(\*{3,}|-{3,})$/gm, '<hr>');
    
    // 处理标题
    markdown = markdown.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    markdown = markdown.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    markdown = markdown.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    markdown = markdown.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
    markdown = markdown.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
    
    // 处理任务列表
    markdown = markdown.replace(/^- \[ \] (.*$)/gm, '<div class="task-list-item"><input type="checkbox" disabled> $1</div>');
    markdown = markdown.replace(/^- \[x\] (.*$)/gmi, '<div class="task-list-item"><input type="checkbox" checked disabled> $1</div>');
    
    // 处理删除线
    markdown = markdown.replace(/~~(.*?)~~/g, '<del>$1</del>');
    
    // 处理粗体
    markdown = markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 处理斜体
    markdown = markdown.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 处理有序和无序列表 - 改进列表处理
    const processedMarkdown = processLists(markdown);
    
    // 处理段落 - 简化段落处理逻辑
    const paragraphLines = processedMarkdown.split('\n');
    const processedParagraphs = processParagraphs(paragraphLines);
    
    markdown = processedParagraphs;
    
    // 恢复行内代码
    inlineCodes.forEach((code, index) => {
        markdown = markdown.replace(`__INLINE_CODE_${index}__`, code);
    });
    
    // 恢复代码块
    codeBlocks.forEach((code, index) => {
        markdown = markdown.replace(`__CODE_BLOCK_${index}__`, code);
    });
    
    return markdown;
}

// 处理表格的辅助函数
function processTable(tableRows, hasHeader) {
    if (tableRows.length === 0) return '';
    
    let html = '<table>';
    
    // 处理表头
    if (hasHeader && tableRows.length >= 2) {
        const headerCells = tableRows[0].split('|').slice(1, -1).map(cell => cell.trim());
        html += '<thead><tr>';
        headerCells.forEach(cell => {
            html += `<th>${cell}</th>`;
        });
        html += '</tr></thead>';
        
        // 移除表头和分隔行
        tableRows = tableRows.slice(2);
    }
    
    // 处理表体
    if (tableRows.length > 0) {
        html += '<tbody>';
        tableRows.forEach(row => {
            const cells = row.split('|').slice(1, -1).map(cell => cell.trim());
            html += '<tr>';
            cells.forEach(cell => {
                html += `<td>${cell}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody>';
    }
    
    html += '</table>';
    return html;
}

// 处理列表的辅助函数
function processLists(markdown) {
    // 处理无序列表
    const ulRegex = /^(\s*)[\*\-•]\s+(.*?)$/gm;
    let match;
    let ulMatches = [];
    
    while ((match = ulRegex.exec(markdown)) !== null) {
        ulMatches.push({
            fullMatch: match[0],
            indent: match[1].length,
            content: match[2],
            index: match.index
        });
    }
    
    // 处理有序列表
    const olRegex = /^(\s*)(\d+)\.\s+(.*?)$/gm;
    let olMatches = [];
    
    while ((match = olRegex.exec(markdown)) !== null) {
        olMatches.push({
            fullMatch: match[0],
            indent: match[1].length,
            number: match[2],
            content: match[3],
            index: match.index
        });
    }
    
    // 合并并按索引排序
    const allMatches = [...ulMatches, ...olMatches].sort((a, b) => a.index - b.index);
    
    if (allMatches.length === 0) return markdown;
    
    // 替换列表
    let result = markdown;
    let offset = 0;
    
    for (let i = 0; i < allMatches.length; i++) {
        const current = allMatches[i];
        const isUl = 'number' in current === false;
        
        // 找出当前层级的所有连续列表项
        let j = i;
        const listItems = [];
        
        while (j < allMatches.length && 
               ((isUl && !('number' in allMatches[j])) || (!isUl && 'number' in allMatches[j])) &&
               allMatches[j].indent === current.indent) {
            listItems.push(allMatches[j].content);
            j++;
        }
        
        if (listItems.length > 0) {
            // 构建HTML
            const listTag = isUl ? 'ul' : 'ol';
            const listHtml = `<${listTag}>${listItems.map(item => `<li>${item}</li>`).join('')}</${listTag}>`;
            
            // 替换原始文本
            const startPos = current.index + offset;
            const endPos = (j < allMatches.length ? allMatches[j].index : result.length) + offset;
            const originalText = result.substring(startPos, endPos);
            
            result = result.substring(0, startPos) + listHtml + result.substring(endPos);
            
            // 更新偏移量
            offset += listHtml.length - originalText.length;
            
            // 更新索引
            i = j - 1;
        }
    }
    
    return result;
}

// 处理段落的辅助函数
function processParagraphs(lines) {
    const result = [];
    let inParagraph = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isEmptyLine = line.trim() === '';
        const startsWithHtml = /^<\w+/.test(line);
        
        // 如果是空行，结束当前段落
        if (isEmptyLine) {
            if (inParagraph) {
                result[result.length - 1] += '</p>';
            inParagraph = false;
        }
            result.push('');
            continue;
    }
        
        // 如果是HTML标签开始，直接添加
        if (startsWithHtml) {
    if (inParagraph) {
                result[result.length - 1] += '</p>';
                inParagraph = false;
            }
            result.push(line);
            continue;
        }
        
        // 普通文本，添加到段落
        if (!inParagraph) {
            result.push('<p>' + line);
            inParagraph = true;
        } else {
            result[result.length - 1] += ' ' + line;
        }
    }
    
    // 关闭最后的段落
    if (inParagraph) {
        result[result.length - 1] += '</p>';
    }
    
    return result.join('\n');
}

// 转义HTML特殊字符
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 获取当前时间
function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// 生成AI响应
async function generateAIResponse(userMessage, mode, model = null) {
    try {
        // 使用指定的模型调用API
        const response = await apiService.getChatCompletion(userMessage, mode, model);
        
        // 移除思考指示器
        removeThinkingIndicator();
        
        // 使用消息添加函数添加AI响应
        if (response && response.choices && response.choices.length > 0) {
            const aiMessage = response.choices[0].message.content;
            addMessageToUI(aiMessage, 'ai');
            
            // 保存当前会话
            saveCurrentSession();
        } else {
            console.error('无效的API响应:', response);
            addMessageToUI('抱歉，我无法生成响应。请稍后再试。', 'ai');
        }
    } catch (error) {
        console.error('生成AI响应时出错:', error);
        
        // 移除思考指示器
        removeThinkingIndicator();
        
        // 添加错误消息
        addMessageToUI(`抱歉，生成响应时出错: ${error.message}`, 'ai');
        
        // 保存当前会话
        saveCurrentSession();
    }
    
    // 滚动到底部
    scrollToBottom();
}

// 提取关键词
function extractKeywords(text) {
    // 简单的关键词提取
    const commonWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '什么', '那', '吗'];
    
    // 分词并过滤常用词
    return text.split(/\s+/)
        .filter(word => word.length > 1 && !commonWords.includes(word))
        .slice(0, 5);
}

// 生成搜索模式响应
function generateSearchModeResponse(userMessage, keywords) {
    // 根据用户消息的内容，生成相关的回复
    
    // 简单的分类处理
    if (userMessage.includes('编程') || userMessage.includes('代码') || userMessage.includes('Python') || userMessage.includes('JavaScript')) {
        return generateProgrammingResponse(userMessage);
    }
    
    if (userMessage.includes('推荐') || userMessage.includes('建议')) {
        return generateRecommendationResponse(userMessage);
    }
    
    if (userMessage.includes('解释') || userMessage.includes('什么是') || userMessage.includes('怎么理解')) {
        return generateExplanationResponse(userMessage);
    }
    
    // 默认回复
    return `根据您提到的"${keywords.join('、')}"，我找到了以下相关信息：

${generateRandomParagraphs(3, keywords)}

希望这些信息对您有所帮助。如果您需要更深入的分析，可以尝试使用"Think"模式。`;
}

// 生成思考模式响应
function generateThinkModeResponse(userMessage, keywords) {
    return `## 关于"${keywords.join('、')}"的思考分析

### 1. 核心概念分析
${generateRandomParagraphs(1, keywords)}

### 2. 多角度思考
${generateRandomParagraphs(1, keywords)}

### 3. 潜在影响与意义
${generateRandomParagraphs(1, keywords)}

### 4. 总结
${generateRandomParagraphs(1, keywords)}

*以上分析基于当前可用信息，如需更具体的解答，可以提出更明确的问题。*`;
}

// 生成编程相关响应
function generateProgrammingResponse(userMessage) {
    if (userMessage.includes('Python')) {
        return `Python是一种流行的高级编程语言，以其简洁易读的语法和强大的功能而闻名。以下是一个简单的Python示例：

\`\`\`python
def greet(name):
    """简单的问候函数"""
    return f"你好，{name}！欢迎学习Python。"

# 使用函数
print(greet("用户"))

# 列表操作示例
numbers = [1, 2, 3, 4, 5]
squared = [x**2 for x in numbers]
print(f"原始数字: {numbers}")
print(f"平方后: {squared}")
\`\`\`

Python广泛应用于数据分析、人工智能、Web开发等多个领域。如果你有特定的Python问题，可以更具体地告诉我。`;
    }
    
    if (userMessage.includes('JavaScript')) {
        return `JavaScript是Web开发中不可或缺的前端语言，以下是一个简单的示例：

\`\`\`javascript
// 简单的问候函数
function greet(name) {
    return "你好，" + name + "！欢迎学习JavaScript。";
}

// 使用函数
console.log(greet("用户"));

// 数组操作示例
const numbers = [1, 2, 3, 4, 5];
const squared = numbers.map(x => x * x);
console.log("原始数字:", numbers);
console.log("平方后:", squared);

// DOM操作示例
document.addEventListener("DOMContentLoaded", () => {
    const button = document.createElement("button");
    button.textContent = "点击我";
    button.addEventListener("click", () => {
        alert("按钮被点击了！");
    });
    document.body.appendChild(button);
});
\`\`\`

JavaScript可用于创建交互式网站、移动应用和服务器端开发(Node.js)。如有特定问题，请随时提问。`;
    }
    
    return `编程是通过编写代码指示计算机执行特定任务的过程。以下是一些流行的编程语言及其应用领域：

1. **Python**: 数据分析、AI、Web开发、自动化
2. **JavaScript**: Web前端、Node.js后端开发
3. **Java**: 企业级应用、Android开发
4. **C++**: 系统软件、游戏开发、性能关键应用
5. **Go**: 云服务、分布式系统

初学者通常建议从Python开始，因为它语法简单且应用广泛。您想了解哪种编程语言的更多信息？`;
}

// 生成推荐响应
function generateRecommendationResponse(userMessage) {
    if (userMessage.includes('书') || userMessage.includes('读物')) {
        return `根据您的兴趣，以下是几本推荐阅读的书籍：

1. **《思考，快与慢》** - 丹尼尔·卡尼曼
   探讨人类思维的两种模式，以及它们如何影响我们的决策。

2. **《人类简史》** - 尤瓦尔·赫拉利
   从认知革命到人工智能时代，全面回顾人类历史。

3. **《原则》** - 雷·达利奥
   桥水基金创始人分享的生活和工作原则。

4. **《深度工作》** - 卡尔·纽波特
   如何在注意力分散的世界中培养专注能力。

5. **《刻意练习》** - 安德斯·艾利克森
   探索成为任何领域专家的科学方法。

您对哪些主题或领域的书特别感兴趣？我可以提供更有针对性的推荐。`;
    }
    
    return `基于您的请求，以下是一些推荐：

${generateRandomParagraphs(3, ['推荐', '选择', '建议'])}

希望这些推荐对您有所帮助。如果您需要更具体的建议，可以提供更多关于您喜好或需求的详细信息。`;
}

// 生成解释响应
function generateExplanationResponse(userMessage) {
    return `关于${userMessage.replace(/什么是|解释|怎么理解/g, '').trim()}的解释：

${generateRandomParagraphs(3, [userMessage.replace(/什么是|解释|怎么理解/g, '').trim()])}

希望这个解释对您有所帮助。如果您想了解更多细节或有其他问题，请随时提问。`;
}

// 生成随机段落
function generateRandomParagraphs(count, keywords) {
    const paragraphs = [];
    
    for (let i = 0; i < count; i++) {
        const keywordIndex = Math.floor(Math.random() * keywords.length);
        const keyword = keywords[keywordIndex] || '这个主题';
        
        const templates = [
            `研究表明，${keyword}在现代社会中扮演着越来越重要的角色。专家们认为，理解${keyword}的本质对于把握未来发展趋势至关重要。`,
            `从历史角度来看，${keyword}的发展经历了多个阶段。每个阶段都有其独特的特点和贡献，共同构成了我们今天所理解的${keyword}概念。`,
            `${keyword}的核心价值在于它能够连接不同的领域和概念。通过这种连接，我们可以获得更全面的认知和更深入的理解。`,
            `对于${keyword}，不同的专家可能持有不同的观点。有些人强调其实用性，而另一些人则更关注理论基础。这种多元视角有助于我们全面理解${keyword}。`,
            `在实践中，${keyword}的应用需要考虑多种因素。包括环境条件、资源限制以及潜在的影响等。综合考虑这些因素，才能更好地应用${keyword}。`
        ];
        
        const randomIndex = Math.floor(Math.random() * templates.length);
        paragraphs.push(templates[randomIndex]);
    }
    
    return paragraphs.join('\n\n');
}

// 清除聊天历史
function clearChatHistory() {
    chatHistory = [];
    messagesContainer.innerHTML = '';
    
    // 清空输入框并重置高度
    chatInput.value = '';
    resetTextareaHeight();
    
    // 如果有当前会话，将其消息清空
    if (currentSessionId) {
        const session = sessions.find(s => s.id === currentSessionId);
        if (session) {
            session.messages = [];
            session.lastUpdated = new Date();
            saveSessions();
        }
    }
}

// 滚动到底部
function scrollToBottom() {
    const chatArea = document.querySelector('.chat-area');
    chatArea.scrollTop = chatArea.scrollHeight;
}

// 格式化保存的时间戳
function formatSavedTime(timestamp) {
    try {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch (error) {
        return getCurrentTime();
    }
}

// 检查用户登录状态
function checkUserLoginStatus() {
    // 从localStorage获取用户令牌
    const savedToken = localStorage.getItem(USER_KEY);
    
    if (savedToken) {
        try {
            // 验证令牌
            const userData = validateUserToken(savedToken);
            
            if (userData) {
                // 令牌有效，设置当前用户
                currentUser = {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    initials: getInitials(userData.name),
                    avatar: userData.avatar,
                    rememberMe: true
                };
                
                // 更新UI
                updateUserUI();
            } else {
                // 令牌无效或过期
                currentUser = null;
                localStorage.removeItem(USER_KEY);
                showLoginModal();
            }
        } catch (e) {
            console.error('解析用户数据出错:', e);
            currentUser = null;
            // 清除无效数据
            localStorage.removeItem(USER_KEY);
            showLoginModal();
        }
    } else {
        // 没有登录信息，显示登录界面
        showLoginModal();
    }
}

// 更新用户界面
function updateUserUI() {
    if (authService.isLoggedIn || currentUser) {
        const user = currentUser || authService.getCurrentUser();
        if (!user) return;
        
        // 更新用户按钮显示
        userMenuBtn.textContent = user.initials || 'U';
        userMenuBtn.title = `${user.name} (${user.email})`;
        
        // 确保用户相关元素可见
        document.querySelectorAll('.require-auth').forEach(el => {
            el.style.display = '';
        });
        
        // 根据用户角色设置权限
        if (authService.isAdmin()) {
            // 管理员特有元素
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = '';
            });
            
            // 添加管理员标记
            userMenuBtn.classList.add('admin-user');
            
            // 在用户菜单中添加管理选项
            const adminEntryExists = Array.from(userMenu.children).some(item => 
                item.classList.contains('admin-entry'));
            
            if (!adminEntryExists) {
                const adminEntry = document.createElement('div');
                adminEntry.className = 'menu-item admin-entry';
                adminEntry.innerHTML = '<i class="fas fa-cog"></i> 管理设置';
                adminEntry.addEventListener('click', () => {
                    hideUserMenu();
                    showAdminPanel();
                });
                
                // 将管理入口添加到菜单的第一项
                userMenu.insertBefore(adminEntry, userMenu.firstChild);
            }
        } else {
            // 非管理员隐藏管理员特有元素
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
            
            // 移除管理员标记
            userMenuBtn.classList.remove('admin-user');
            
            // 移除管理入口
            const adminEntry = userMenu.querySelector('.admin-entry');
            if (adminEntry) {
                adminEntry.remove();
            }
        }
    } else {
        // 未登录状态
        userMenuBtn.textContent = '登录';
        userMenuBtn.title = '点击登录';
        userMenuBtn.classList.remove('admin-user');
        
        // 隐藏需要登录才能看到的元素
        document.querySelectorAll('.require-auth').forEach(el => {
            el.style.display = 'none';
        });
        
        // 隐藏管理员特有元素
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
    }
}

// 显示管理面板（仅限管理员）
function showAdminPanel() {
    if (!authService.isAdmin()) {
        addMessageToUI('您没有权限访问管理功能', 'ai');
        return;
    }
    
    // 创建管理面板
    const adminPanel = document.createElement('div');
    adminPanel.className = 'admin-panel';
    adminPanel.innerHTML = `
        <div class="admin-container">
            <div class="admin-header">
                <h2>管理设置</h2>
                <button class="close-btn"><i class="fas fa-times"></i></button>
            </div>
            <div class="admin-body">
                <div class="admin-tabs">
                    <button class="tab-btn active" data-tab="users">用户管理</button>
                    <button class="tab-btn" data-tab="settings">系统设置</button>
                    <button class="tab-btn" data-tab="logs">操作日志</button>
                </div>
                <div class="admin-content">
                    <div class="tab-panel active" id="users-panel">
                        <h3>用户管理</h3>
                        <p>这里可以管理系统用户、分配角色等。</p>
                        <button class="admin-action-btn" id="refresh-users-btn">
                            <i class="fas fa-sync"></i> 刷新用户列表
                        </button>
                        <div class="users-list" id="admin-users-list">
                            <div class="loading-users">加载用户列表中...</div>
                        </div>
                    </div>
                    <div class="tab-panel" id="settings-panel">
                        <h3>系统设置</h3>
                        <p>这里可以管理系统配置、API设置等。</p>
                        <div class="settings-form">
                            <div class="input-group">
                                <label>API基础URL</label>
                                <input type="text" id="api-base-url" placeholder="例如: https://api.example.com">
                            </div>
                            <div class="input-group">
                                <label>默认模型</label>
                                <select id="default-model">
                                    <option value="deepseek/deepseek-r1:free">DeepSeek R1 (免费)</option>
                                    <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
                                    <option value="anthropic/claude-3-sonnet">Claude 3 Sonnet</option>
                                </select>
                            </div>
                            <button class="admin-action-btn" id="save-settings-btn">
                                <i class="fas fa-save"></i> 保存设置
                            </button>
                        </div>
                    </div>
                    <div class="tab-panel" id="logs-panel">
                        <h3>操作日志</h3>
                        <p>查看系统操作日志</p>
                        <div class="logs-list">
                            <div class="log-entry">
                                <span class="log-time">2024-03-27 12:00:00</span>
                                <span class="log-user">admin</span>
                                <span class="log-action">登录系统</span>
                            </div>
                            <div class="log-entry">
                                <span class="log-time">2024-03-27 12:05:10</span>
                                <span class="log-user">admin</span>
                                <span class="log-action">修改系统设置</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(adminPanel);
    
    // 设置关闭按钮事件
    const closeBtn = adminPanel.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        closeAdminPanel();
    });
    
    // 设置标签切换事件
    const tabBtns = adminPanel.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除所有活动标签
            tabBtns.forEach(b => b.classList.remove('active'));
            adminPanel.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            
            // 激活当前标签
            btn.classList.add('active');
            const tabId = btn.dataset.tab + '-panel';
            adminPanel.querySelector(`#${tabId}`).classList.add('active');
        });
    });
    
    // 加载用户列表
    loadAdminUsers(adminPanel);
    
    // 设置保存设置事件
    const saveSettingsBtn = adminPanel.querySelector('#save-settings-btn');
    saveSettingsBtn.addEventListener('click', () => {
        saveAdminSettings();
    });
    
    // 添加动画类
    setTimeout(() => {
        adminPanel.classList.add('visible');
    }, 10);
}

// 关闭管理面板
function closeAdminPanel() {
    const adminPanel = document.querySelector('.admin-panel');
    if (adminPanel) {
        adminPanel.classList.remove('visible');
        setTimeout(() => {
            adminPanel.remove();
        }, 300);
    }
}

// 加载管理用户列表
async function loadAdminUsers(adminPanel) {
    try {
        // 获取用户数据
        const response = await fetch('users.json');
        const data = await response.json();
        
        if (!data || !data.users) {
            throw new Error('无法获取用户数据');
        }
        
        const usersList = adminPanel.querySelector('#admin-users-list');
        usersList.innerHTML = '';
        
        // 为每个用户创建列表项
        data.users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            
            // 解密用户名
            let userName = '未知用户';
            try {
                if (user.name_encrypted) {
                    userName = CryptoJS.AES.decrypt(
                        user.name_encrypted, 
                        'Origin-Name-Key-2023'
                    ).toString(CryptoJS.enc.Utf8);
                }
            } catch (e) {
                console.error('解密用户名失败:', e);
            }
            
            userItem.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar">${user.initials || 'U'}</div>
                    <div class="user-details">
                        <div class="user-name">${userName}</div>
                        <div class="user-role">${user.role || 'user'}</div>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="user-action-btn" data-action="edit" data-id="${user.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="user-action-btn" data-action="delete" data-id="${user.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            usersList.appendChild(userItem);
        });
        
        // 绑定用户操作按钮事件
        adminPanel.querySelectorAll('.user-action-btn').forEach(btn => {
            btn.addEventListener('click', event => {
                const action = btn.dataset.action;
                const userId = btn.dataset.id;
                
                if (action === 'edit') {
                    editUser(userId);
                } else if (action === 'delete') {
                    deleteUser(userId);
                }
            });
        });
    } catch (error) {
        console.error('加载用户列表失败:', error);
        const usersList = adminPanel.querySelector('#admin-users-list');
        usersList.innerHTML = `
            <div class="error-message">
                加载用户列表失败: ${error.message}
            </div>
        `;
    }
}

// 显示登录模态框
function showLoginModal() {
    // 创建登录模态框
    const modal = document.createElement('div');
    modal.className = 'login-modal';
    modal.innerHTML = `
        <div class="login-container">
            <div class="login-header">
                <h2>登录到 Origin</h2>
                <button class="close-btn"><i class="fas fa-times"></i></button>
            </div>
            <div class="login-body">
                <div class="input-group">
                    <label for="login-email">邮箱</label>
                    <input type="email" id="login-email" placeholder="请输入邮箱地址" required>
                </div>
                <div class="input-group">
                    <label for="login-password">密码</label>
                    <input type="password" id="login-password" placeholder="请输入密码" required>
                </div>
                <div class="login-options">
                    <label class="checkbox-container">
                        <input type="checkbox" id="remember-me">
                        <span class="checkbox-text">记住我</span>
                    </label>
                    <a href="#" class="forgot-password">忘记密码?</a>
                </div>
                <button class="login-btn">登录</button>
                <div class="login-divider">
                    <span>或者</span>
                </div>
                <!-- 社交登录按钮已移除 -->
                <p class="signup-link">还没有账号? <a href="#">注册</a></p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 阻止冒泡，防止点击模态框内容时关闭
    const loginContainer = modal.querySelector('.login-container');
    loginContainer.addEventListener('click', e => {
        e.stopPropagation();
    });
    
    // 关闭按钮事件
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        closeLoginModal();
    });
    
    // 点击模态框背景关闭
    modal.addEventListener('click', () => {
        closeLoginModal();
    });
    
    // 登录按钮事件
    const loginBtn = modal.querySelector('.login-btn');
    loginBtn.addEventListener('click', () => {
        handleLogin();
    });
    
    // 表单输入按Enter提交
    const emailInput = modal.querySelector('#login-email');
    const passwordInput = modal.querySelector('#login-password');
    
    passwordInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    // 社交登录按钮事件已移除
    
    // 注册链接事件
    const signupLink = modal.querySelector('.signup-link a');
    signupLink.addEventListener('click', e => {
        e.preventDefault();
        showSignupModal();
    });
    
    // 自动聚焦邮箱输入框
    setTimeout(() => {
        emailInput.focus();
    }, 100);
    
    // 添加动画类
    setTimeout(() => {
        modal.classList.add('visible');
    }, 10);
}

// 关闭登录模态框
function closeLoginModal() {
    const modal = document.querySelector('.login-modal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// 处理登录逻辑
function handleLogin() {
    const modal = document.querySelector('.login-modal');
    if (!modal) return;
    
    const email = modal.querySelector('#login-email').value.trim();
    const password = modal.querySelector('#login-password').value;
    const rememberMe = modal.querySelector('#remember-me').checked;
    
    // 验证输入
    if (!email || !password) {
        showLoginError('请输入邮箱和密码');
        return;
    }
    
    if (!isValidEmail(email)) {
        showLoginError('请输入有效的邮箱地址');
        return;
    }
    
    // 显示加载状态
    const loginBtn = modal.querySelector('.login-btn');
    const originalText = loginBtn.textContent;
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';
    
    // 使用authService进行登录
    authService.login(email, password)
        .then(data => {
            if (data.success) {
                // 登录成功，关闭登录框
                closeLoginModal();
                
                // 显示欢迎消息
                const user = authService.getCurrentUser();
                showWelcomeUser(user);
                
                // 刷新界面上的用户信息
                initUserMenu();
            } else {
                // 登录失败
                showLoginError(data.message || '登录失败，请检查邮箱和密码');
                
                // 恢复按钮状态
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalText;
            }
        })
        .catch(error => {
            console.error('登录请求失败:', error);
            showLoginError('网络错误，请稍后再试');
            
            // 恢复按钮状态
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalText;
        });
}

// 显示登录错误
function showLoginError(message) {
    const modal = document.querySelector('.login-modal');
    if (!modal) return;
    
    // 检查是否已有错误消息
    let errorElement = modal.querySelector('.login-error');
    
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'login-error';
        const loginBody = modal.querySelector('.login-body');
        loginBody.insertBefore(errorElement, loginBody.firstChild);
    }
    
    errorElement.textContent = message;
    errorElement.style.opacity = '0';
    
    // 添加动画
    setTimeout(() => {
        errorElement.style.opacity = '1';
    }, 10);
}

// 获取用户名首字母
function getInitials(name) {
    if (!name) return '游';
    
    // 取最多两个首字母
    return name.split(/\s+/).map(n => n.charAt(0).toUpperCase()).join('').substring(0, 2);
}

// 验证邮箱格式
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// 处理社交登录
function handleSocialLogin(provider) {
    const modal = document.querySelector('.login-modal');
    if (!modal) return;
    
    // 显示加载状态
    const socialBtn = modal.querySelector(`.${provider}-btn`);
    const originalText = socialBtn.textContent;
    socialBtn.disabled = true;
    socialBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 正在登录...`;
    
    // 模拟社交登录流程
    setTimeout(() => {
        // 模拟成功登录
        const userData = {
            id: `${provider}_user_${Date.now()}`,
            name: provider === 'google' ? 'Google用户' : 'GitHub用户',
            email: `user_${Date.now()}@${provider}.com`,
            initials: provider === 'google' ? 'GO' : 'GH',
            avatar: null,
            provider: provider,
            rememberMe: true
        };
        
        // 保存用户信息
        currentUser = userData;
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        
        // 更新UI
        updateUserUI();
        
        // 关闭登录框
        closeLoginModal();
        
        // 显示欢迎消息
        showWelcomeUser(userData);
    }, 2000);
}

// 显示用户欢迎消息
function showWelcomeUser(user) {
    if (!user) return;
    
    // 清空聊天历史
    clearChatHistory();
    
    // 创建新会话
    createNewSession('新对话');
    
    // 显示欢迎消息
    const welcomeMessage = `# 欢迎回来，${user.name}！

您已成功登录，可以开始与AI助手对话了。

有什么我能帮您解答的问题吗？`;
    
    addMessageToUI(formatMarkdown(welcomeMessage), 'ai');
    
    // 保存当前会话
    saveCurrentSession();
}

// 显示注册模态框
function showSignupModal() {
    // 先关闭登录模态框
    closeLoginModal();
    
    // 创建注册模态框
    const modal = document.createElement('div');
    modal.className = 'login-modal signup-modal';
    modal.innerHTML = `
        <div class="login-container">
            <div class="login-header">
                <h2>创建账号</h2>
                <button class="close-btn"><i class="fas fa-times"></i></button>
            </div>
            <div class="login-body">
                <div class="input-group">
                    <label for="signup-name">姓名</label>
                    <input type="text" id="signup-name" placeholder="请输入您的姓名" required>
                </div>
                <div class="input-group">
                    <label for="signup-email">邮箱</label>
                    <input type="email" id="signup-email" placeholder="请输入邮箱地址" required>
                </div>
                <div class="input-group">
                    <label for="signup-password">密码</label>
                    <input type="password" id="signup-password" placeholder="请输入密码" required>
                </div>
                <div class="input-group">
                    <label for="signup-confirm-password">确认密码</label>
                    <input type="password" id="signup-confirm-password" placeholder="请再次输入密码" required>
                </div>
                <div class="login-options">
                    <label class="checkbox-container">
                        <input type="checkbox" id="agree-terms" checked>
                        <span class="checkbox-text">我同意<a href="#">服务条款</a>和<a href="#">隐私政策</a></span>
                    </label>
                </div>
                <button class="login-btn signup-btn">创建账号</button>
                <div class="login-divider">
                    <span>或者</span>
                </div>
                <!-- 社交登录按钮已移除 -->
                <p class="signup-link">已有账号? <a href="#">登录</a></p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 阻止冒泡，防止点击模态框内容时关闭
    const signupContainer = modal.querySelector('.login-container');
    signupContainer.addEventListener('click', e => {
        e.stopPropagation();
    });
    
    // 关闭按钮事件
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        closeSignupModal();
    });
    
    // 点击模态框背景关闭
    modal.addEventListener('click', () => {
        closeSignupModal();
    });
    
    // 注册按钮事件
    const signupBtn = modal.querySelector('.signup-btn');
    signupBtn.addEventListener('click', () => {
        handleSignup();
    });
    
    // 社交注册按钮事件已移除
    
    // 返回登录事件
    const loginLink = modal.querySelector('.signup-link a');
    loginLink.addEventListener('click', e => {
        e.preventDefault();
        closeSignupModal();
        showLoginModal();
    });
    
    // 自动聚焦姓名输入框
    setTimeout(() => {
        modal.querySelector('#signup-name').focus();
    }, 100);
    
    // 添加动画类
    setTimeout(() => {
        modal.classList.add('visible');
    }, 10);
}

// 关闭注册模态框
function closeSignupModal() {
    const modal = document.querySelector('.signup-modal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// 处理注册逻辑
function handleSignup() {
    const modal = document.querySelector('.signup-modal');
    if (!modal) return;
    
    const name = modal.querySelector('#signup-name').value.trim();
    const email = modal.querySelector('#signup-email').value.trim();
    const password = modal.querySelector('#signup-password').value;
    const confirmPassword = modal.querySelector('#signup-confirm-password').value;
    const agreeTerms = modal.querySelector('#agree-terms').checked;
    
    // 验证输入
    if (!name || !email || !password || !confirmPassword) {
        showSignupError('请填写所有必填字段');
        return;
    }
    
    if (!isValidEmail(email)) {
        showSignupError('请输入有效的邮箱地址');
        return;
    }
    
    if (password !== confirmPassword) {
        showSignupError('两次输入的密码不匹配');
        return;
    }
    
    if (!agreeTerms) {
        showSignupError('请同意服务条款和隐私政策');
        return;
    }
    
    // 显示加载状态
    const signupBtn = modal.querySelector('.signup-btn');
    const originalText = signupBtn.textContent;
    signupBtn.disabled = true;
    signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 创建中...';
    
    // 使用authService进行注册
    authService.register(name, email, password)
        .then(data => {
            if (data.success) {
                // 注册成功
                closeSignupModal();
                
                // 显示欢迎消息
                addMessageToUI(data.message, 'ai');
                
                // 刷新界面上的用户信息
                initUserMenu();
            } else {
                // 注册失败
                showSignupError(data.message || '注册失败，请稍后再试');
                
                // 恢复按钮状态
                signupBtn.disabled = false;
                signupBtn.innerHTML = originalText;
            }
        })
        .catch(error => {
            console.error('注册请求失败:', error);
            showSignupError('网络错误，请稍后再试');
            
            // 恢复按钮状态
            signupBtn.disabled = false;
            signupBtn.innerHTML = originalText;
        });
}

// 显示注册错误
function showSignupError(message) {
    const modal = document.querySelector('.signup-modal');
    if (!modal) return;
    
    // 检查是否已有错误消息
    let errorElement = modal.querySelector('.login-error');
    
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'login-error';
        const loginBody = modal.querySelector('.login-body');
        loginBody.insertBefore(errorElement, loginBody.firstChild);
    }
    
    errorElement.textContent = message;
    errorElement.style.opacity = '0';
    
    // 添加动画
    setTimeout(() => {
        errorElement.style.opacity = '1';
    }, 10);
}

// 退出登录
function signOut() {
    if (confirm('确定要退出登录吗？')) {
        // 清除用户信息
        currentUser = null;
        localStorage.removeItem(USER_KEY);
        
        // 清除所有会话（在真实环境中可能需要保留）
        sessions = [];
        localStorage.removeItem('chatSessions');
        localStorage.removeItem('currentSessionId');
        
        // 更新UI
        updateUserUI();
        
        // 刷新页面或重新初始化
        window.location.reload();
    }
}

// 添加消息到UI
function addMessageToUI(content, sender) {
    // 生成唯一的消息ID
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 检查是否已经有同样内容的消息（防止重复）
    const existingMessages = messagesContainer.querySelectorAll('.message-content');
    if (existingMessages.length > 0) {
        const lastMessage = existingMessages[existingMessages.length - 1];
        const lastMessageContent = lastMessage.textContent || '';
        
        // 如果最后一条消息内容与当前内容相同，不添加
        if (lastMessageContent.includes(content) && lastMessage.closest('.message').getAttribute('data-sender') === sender) {
            console.log('防止重复添加消息:', content.substring(0, 20) + '...');
            return;
        }
    }
    
    // 使用适当的模板
    const template = sender === 'user' ? userMessageTemplate : aiMessageTemplate;
    
    // 克隆模板
    const messageElement = template.content.cloneNode(true);
    const messageWrapper = messageElement.querySelector('.message');
    const messageContent = messageElement.querySelector('.message-content');
    
    // 设置数据属性
    messageWrapper.setAttribute('data-message-id', messageId);
    messageWrapper.setAttribute('data-sender', sender);
    
    // 设置消息内容
    if (sender === 'ai') {
        // 格式化AI消息的Markdown
        messageContent.innerHTML = formatMessage(content);
        
        // 添加复制按钮（仅对AI消息）
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i><span class="copy-text">复制</span>';
        copyBtn.title = '复制内容';
        copyBtn.setAttribute('data-action', 'copy');
        messageContent.appendChild(copyBtn);
    } else {
        // 用户消息使用纯文本
        messageContent.textContent = content;
    }
    
    // 设置时间
    const timeElement = messageElement.querySelector('.message-time');
    timeElement.textContent = getCurrentTime();
    
    // 添加到消息容器
    messagesContainer.appendChild(messageElement);
    
    // 添加到聊天历史记录
    chatHistory.push({
        id: messageId,
        sender: sender,
        content: content,
        timestamp: Date.now()
    });
    
    // 滚动到底部
    scrollToBottom();
    
    return messageId;
}

// 添加复制按钮到所有消息
function addCopyButtonsToMessages() {
    // 获取所有AI消息
    const aiMessages = messagesContainer.querySelectorAll('.ai-message .message-content');
    
    // 为每个AI消息添加复制按钮（如果没有）
    aiMessages.forEach(messageContent => {
        // 检查是否已有复制按钮
        if (!messageContent.querySelector('.copy-btn')) {
            // 创建复制按钮
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i><span class="copy-text">复制</span>';
            copyBtn.title = '复制内容';
            copyBtn.setAttribute('data-action', 'copy');
            
            // 添加到消息内容元素
            messageContent.appendChild(copyBtn);
        }
    });
    
    console.log('已为所有AI消息添加复制按钮');
}

// 处理复制按钮点击事件
function handleCopyButtonClick(e) {
    const copyBtn = e.target.closest('[data-action="copy"]');
    if (!copyBtn) return;
    
    // 阻止事件冒泡
    e.stopPropagation();
    
    // 获取消息内容
    const messageContent = copyBtn.closest('.message-content');
    if (!messageContent) return;
    
    // 创建一个临时元素来存储纯文本内容
    const tempElement = document.createElement('div');
    tempElement.innerHTML = messageContent.innerHTML;
    
    // 移除复制按钮等不需要复制的元素
    const btnToRemove = tempElement.querySelector('.copy-btn');
    if (btnToRemove) btnToRemove.remove();
    
    // 获取纯文本
    const textToCopy = tempElement.textContent.trim();
    
    // 复制到剪贴板
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            // 显示复制成功提示
            const copyText = copyBtn.querySelector('.copy-text');
            if (copyText) {
                const originalText = copyText.textContent;
                copyText.textContent = '已复制!';
                
                // 恢复原文本
                setTimeout(() => {
                    copyText.textContent = originalText;
                }, 2000);
            }
        })
        .catch(err => {
            console.error('复制失败:', err);
        });
}

// 处理特殊命令
function handleSpecialCommand(command) {
    // 处理特殊命令
    if (command.startsWith('/clear')) {
        clearChatHistory();
        return true;
    }
    
    if (command.startsWith('/help')) {
        const helpMessage = `# Origin AI 帮助指南

## 基本功能
- **对话**：直接输入问题或请求
- **DeepSearch**：开启深度搜索，获取更准确的信息
- **Think模式**：获取更深入的分析和推理

## 特殊命令
- **/clear**：清除当前对话历史
- **/help**：显示此帮助信息
- **/reset**：重置AI，开始新的对话

如有其他问题或反馈，请随时告诉我们！`;
        addMessageToUI(formatMarkdown(helpMessage), 'ai');
        return true;
    }
    
    if (command.startsWith('/reset')) {
        clearChatHistory();
        createNewSession('新对话');
        return true;
    }
    
    // 不是特殊命令
    return false;
}

// 从文件名获取文件类型
function getFileTypeFromName(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const typeMap = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'mp3': 'audio/mpeg',
        'mp4': 'video/mp4',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed'
    };
    
    return typeMap[extension] || 'application/octet-stream';
}

// 格式化文件大小
function formatFileSize(size) {
    if (size < 1024) {
        return size + ' B';
    } else if (size < 1024 * 1024) {
        return (size / 1024).toFixed(2) + ' KB';
    } else if (size < 1024 * 1024 * 1024) {
        return (size / (1024 * 1024)).toFixed(2) + ' MB';
    } else {
        return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
}

// 处理上传文件
async function processFile(file) {
    try {
        // 检查文件类型
        const fileType = file.type.toLowerCase();
        let content = '';
        
        // 检查文件类型
        if (fileType === 'application/pdf') {
            content = await processPDF(file);
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   fileType === 'application/msword') {
            content = await processDocument(file);
        } else if (fileType === 'text/plain') {
            content = await file.text();
        } else {
            throw new Error('不支持的文件类型');
        }
        
        // 检查是否包含专利相关关键词
        const patentKeywords = ['审查意见通知书', '审查员', '专利', '权利要求'];
        const hasPatentKeywords = patentKeywords.some(keyword => content.includes(keyword));
        
        if (hasPatentKeywords) {
            // 显示系统提示消息
            showSystemMessage('检测到专利相关文件，已切换到专利答审模式');
            
            // 加载专利答审模式的提示词
            const prompt = PATENT_RESPONSE_PROMPT;
            
            // 发送提示词和文件内容给AI
            await sendMessage(prompt + '\n\n审查意见通知书内容：\n' + content);
        } else {
            // 显示普通文件上传提示
            showSystemMessage('已上传文件，正在分析内容...');
            
            // 发送文件内容给AI
            await sendMessage('请分析以下文件内容：\n\n' + content);
        }
    } catch (error) {
        console.error('文件处理错误:', error);
        showSystemMessage('文件处理失败：' + error.message);
    }
}

// 处理PDF文件
async function processPDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                
                // 提取所有页面的文本
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                
                resolve(fullText);
            } catch (error) {
                reject(new Error('PDF处理失败：' + error.message));
            }
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsArrayBuffer(file);
    });
}

// 处理Word文档
async function processDocument(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const result = await mammoth.extractRawText({ arrayBuffer });
                resolve(result.value);
            } catch (error) {
                reject(new Error('Word文档处理失败：' + error.message));
            }
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsArrayBuffer(file);
    });
}

// 当页面加载完成时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 在所有函数定义之后调用init
    setTimeout(init, 0);
}); 

// 显示思考指示器
function showThinkingIndicator() {
    // 确保没有重复的思考指示器
    removeThinkingIndicator();
    
    // 检查模板是否存在
    if (!thinkingTemplate) {
        console.error('思考指示器模板不存在');
        return;
    }
    
    // 克隆思考指示器模板
    const thinkingElement = thinkingTemplate.content.cloneNode(true);
    
    // 使用.thinking元素作为容器
        const thinkingMessage = thinkingElement.querySelector('.thinking');
        if (thinkingMessage) {
            // 添加唯一ID
            const indicatorId = `thinking-${Date.now()}`;
            thinkingMessage.id = indicatorId;
            
            // 保存当前的思考指示器ID
            currentThinkingIndicator = indicatorId;
            
            // 添加到消息容器
        thinkingMessage.style.opacity = '0';
        thinkingMessage.style.transform = 'translateY(10px)';
            messagesContainer.appendChild(thinkingElement);
        
        // 触发重绘以应用过渡
        setTimeout(() => {
            thinkingMessage.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            thinkingMessage.style.opacity = '1';
            thinkingMessage.style.transform = 'translateY(0)';
        }, 10);
            
            // 滚动到底部
            scrollToBottom();
        
        // 调试输出，确认指示器已添加
        console.log('思考指示器已添加, ID:', indicatorId);
            return;
        }
        
        console.error('思考指示器模板结构不正确');
}

// 移除思考指示器
function removeThinkingIndicator() {
    // 如果有当前思考指示器，则移除
    if (currentThinkingIndicator) {
        const indicator = document.getElementById(currentThinkingIndicator);
        if (indicator) {
            // 添加淡出效果
            indicator.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            indicator.style.opacity = '0';
            indicator.style.transform = 'translateY(-10px)';
            
            // 等待动画完成后移除元素
            setTimeout(() => {
            indicator.remove();
            }, 200);
        }
        currentThinkingIndicator = null;
    }
    
    // 移除所有其他可能的思考指示器
    const allIndicators = messagesContainer.querySelectorAll('.thinking-indicator');
    allIndicators.forEach(indicator => {
        // 添加淡出效果
        indicator.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateY(-10px)';
        
        // 等待动画完成后移除元素
        setTimeout(() => {
        indicator.remove();
        }, 200);
    });
}

// 初始化模型选择器
function initModelSelector() {
    // 检查元素是否存在
    if (!modelSelector) return;
    
    // 保存对下拉菜单的引用
    const modelDropdown = modelSelector.querySelector('.model-dropdown');
    
    // 点击模型选择器显示/隐藏下拉菜单
    modelSelector.addEventListener('click', function(e) {
        e.stopPropagation(); // 防止冒泡到document
        modelSelector.classList.toggle('active');
    });
    
    // 点击页面其他地方关闭下拉菜单
    document.addEventListener('click', function() {
        modelSelector.classList.remove('active');
    });
    
    // 防止点击下拉菜单内容时菜单关闭
    if (modelDropdown) {
        modelDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // 处理模型选择
    const modelItems = document.querySelectorAll('.model-dropdown-item');
    modelItems.forEach(item => {
        item.addEventListener('click', function() {
            // 获取选中的模型
            const selectedModel = this.getAttribute('data-model');
            
            // 更新当前模型
            if (selectedModel) {
                currentModel = selectedModel;
                
                // 更新UI
                modelItems.forEach(mi => mi.classList.remove('selected'));
                this.classList.add('selected');
                
                // 更新选择器显示的文本
                const modelName = this.querySelector('.model-name').textContent;
                modelSelector.querySelector('span').textContent = modelName;
                
                // 关闭下拉菜单
                modelSelector.classList.remove('active');
                
                console.log('已选择模型:', currentModel);
            }
        });
    });
    
    // 初始化显示当前模型名称
    const selectedItem = document.querySelector('.model-dropdown-item.selected');
    if (selectedItem) {
        const modelName = selectedItem.querySelector('.model-name').textContent;
        modelSelector.querySelector('span').textContent = modelName;
    }
}

// 计算并设置滚动条宽度
function setScrollbarWidthVariable() {
    // 创建一个带滚动条的div元素
    const outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll';
    document.body.appendChild(outer);
    
    // 创建一个内部div
    const inner = document.createElement('div');
    outer.appendChild(inner);
    
    // 计算滚动条宽度 (outer宽度 - inner宽度)
    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
    
    // 移除临时元素
    outer.parentNode.removeChild(outer);
    
    // 设置CSS变量
    document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
    console.log('滚动条宽度:', scrollbarWidth);
} 