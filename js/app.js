// app.js
class App {
  constructor() {
    this.initApp();
  }
  
  // 初始化应用
  initApp() {
    this.setupEventListeners();
    this.checkBackendConnection();
  }
  
  // 设置事件监听器
  setupEventListeners() {
    // 登录表单提交
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
          this.showMessage('请输入用户名和密码', 'warning');
          return;
        }
        
        const loginResult = await authService.login(username, password);
        
        if (loginResult.success) {
          this.showMessage(`登录成功，欢迎 ${loginResult.username}`, 'success');
          // 更新UI状态
          this.updateUIAfterLogin(loginResult);
        } else {
          this.showMessage(loginResult.message || '登录失败，请检查用户名和密码', 'error');
        }
      });
    }
    
    // 注销按钮
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        authService.logout();
        this.showMessage('您已成功注销', 'info');
        // 更新UI状态
        this.updateUIAfterLogout();
      });
    }
    
    // 后端状态变化事件
    document.addEventListener('backend-status-changed', (event) => {
      console.log(`后端状态变化: ${event.detail.isOnline ? '在线' : '离线'}`);
    });
  }
  
  // 检查后端连接
  checkBackendConnection() {
    // 利用authService已有的后端检查功能
    authService.checkBackendStatus();
  }
  
  // 登录后更新UI
  updateUIAfterLogin(loginInfo) {
    // 隐藏登录表单，显示用户信息区域
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    
    if (loginForm) loginForm.style.display = 'none';
    if (userInfo) {
      userInfo.style.display = 'block';
      
      // 显示用户名
      const usernameElement = userInfo.querySelector('.username');
      if (usernameElement) {
        usernameElement.textContent = loginInfo.username;
      }
      
      // 显示用户角色
      const roleElement = userInfo.querySelector('.user-role');
      if (roleElement) {
        roleElement.textContent = loginInfo.role === 'admin' ? '管理员' : '用户';
      }
    }
  }
  
  // 注销后更新UI
  updateUIAfterLogout() {
    // 显示登录表单，隐藏用户信息区域
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    
    if (loginForm) loginForm.style.display = 'block';
    if (userInfo) userInfo.style.display = 'none';
  }
  
  // 显示消息提示
  showMessage(message, type = 'info') {
    // 检查是否已存在消息容器
    let messageContainer = document.querySelector('.message-container');
    
    // 如果不存在，创建一个
    if (!messageContainer) {
      messageContainer = document.createElement('div');
      messageContainer.className = 'message-container';
      document.body.appendChild(messageContainer);
    }
    
    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.textContent = message;
    
    // 添加到容器
    messageContainer.appendChild(messageElement);
    
    // 3秒后自动移除
    setTimeout(() => {
      messageElement.classList.add('fade-out');
      setTimeout(() => {
        if (messageContainer.contains(messageElement)) {
          messageContainer.removeChild(messageElement);
        }
      }, 500);
    }, 3000);
  }
}

// 当文档加载完成时初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
}); 