// auth.js
class AuthService {
  constructor() {
    this.isLoggedIn = this.checkLoginStatus();
    this.isOnline = false;
    this.userKey = 'origin_current_user';  // 用户信息存储键名
    this.checkBackendStatus();
    
    // 每30秒检查一次后端状态
    setInterval(() => this.checkBackendStatus(), 30000);
  }
  
  // 检查用户是否已登录
  checkLoginStatus() {
    const token = localStorage.getItem(this.userKey);
    if (!token) return false;
    
    try {
      // 使用crypto.js中的验证函数
      const userData = validateUserToken(token);
      
      if (userData !== null) {
        // 更新全局currentUser变量，确保与checkUserLoginStatus保持一致
        window.currentUser = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          initials: getInitials(userData.name),
          avatar: userData.avatar,
          rememberMe: true
        };
        return true;
      }
      return false;
    } catch (e) {
      console.error('检查登录状态出错:', e);
      return false;
    }
  }
  
  // 检查后端状态
  async checkBackendStatus() {
    try {
      // 使用相对路径
      const response = await fetch('users.json');
      if (response.ok) {
        this.isOnline = true;
        console.log('用户数据可访问');
        // 更新Think按钮状态
        this.updateThinkButtonStatus(true);
      } else {
        this.isOnline = false;
        console.error('无法访问用户数据，服务器返回:', response.status);
        // 更新Think按钮状态
        this.updateThinkButtonStatus(false);
      }
    } catch (error) {
      this.isOnline = false;
      console.error('无法访问用户数据，认证功能可能不可用');
      // 更新Think按钮状态
      this.updateThinkButtonStatus(false);
    }
    
    // 触发状态变化事件
    document.dispatchEvent(new CustomEvent('auth-status-changed', { 
      detail: { isOnline: this.isOnline } 
    }));
  }
  
  // 更新Think按钮状态
  updateThinkButtonStatus(isOnline) {
    const thinkBtn = document.querySelector('.think-btn');
    if (!thinkBtn) return;
    
    if (isOnline) {
      thinkBtn.classList.remove('disabled');
      thinkBtn.disabled = false;
      thinkBtn.title = "思考模式 (可用)";
    } else {
      thinkBtn.classList.add('disabled');
      thinkBtn.disabled = true;
      thinkBtn.title = "思考模式 (需要访问用户数据)";
    }
  }
  
  // 前端登录验证
  async login(email, password) {
    try {
      if (!this.isOnline) {
        return { success: false, message: '无法访问用户数据，认证功能不可用' };
      }
      
      // 使用crypto.js中的认证函数
      const result = await authenticateUser(email, password);
      
      if (result.success) {
        const user = result.user;
        
        // 生成用户令牌并保存
        const token = generateUserToken(user);
        localStorage.setItem(this.userKey, token);
        
        this.isLoggedIn = true;
      }
      
      return result;
    } catch (error) {
      console.error('登录出错:', error);
      return { success: false, message: '登录过程中出现错误' };
    }
  }
  
  // 注册方法
  async register(name, email, password) {
    try {
      if (!this.isOnline) {
        return { success: false, message: '无法访问用户数据，注册功能不可用' };
      }
      
      // 使用crypto.js中的注册函数
      const result = await registerUser(name, email, password);
      
      if (result.success) {
        const user = result.user;
        
        // 生成用户令牌并保存
        const token = generateUserToken(user);
        localStorage.setItem(this.userKey, token);
        
        this.isLoggedIn = true;
      }
      
      return result;
    } catch (error) {
      console.error('注册出错:', error);
      return { success: false, message: '注册过程中出现错误' };
    }
  }
  
  // 注销方法
  logout() {
    localStorage.removeItem(this.userKey);
    this.isLoggedIn = false;
    location.reload(); // 刷新页面以重置状态
  }
  
  // 获取当前用户
  getCurrentUser() {
    const token = localStorage.getItem(this.userKey);
    if (!token) return null;
    
    try {
      // 验证并解析用户令牌
      return validateUserToken(token);
    } catch (e) {
      console.error('获取用户信息出错:', e);
      return null;
    }
  }
  
  // 检查用户是否为管理员
  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === 'admin';
  }
}

// 创建并导出认证服务实例
const authService = new AuthService(); 