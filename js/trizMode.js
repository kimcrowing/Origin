// trizMode.js
class TrizModeService {
  constructor() {
    this.isActive = false;
    this.initialized = false;
    
    // 在页面加载时初始化TRIZ按钮事件
    document.addEventListener('DOMContentLoaded', () => {
      this.initTrizButton();
      this.initSubmitButtonListener();
      
      // 检查deepSearchToggle状态，同步按钮状态
      this.syncButtonState();
    });
    
    // TRIZ专利分析提示词
    this.TRIZ_ANALYSIS_PROMPT = `你是一位TRIZ创新理论专家，请对本专利和对比专利进行TRIZ原理对比分析，识别出以下内容：

1. 分析两个专利解决的核心矛盾
   - 确定本专利解决的技术矛盾
   - 确定对比专利解决的技术矛盾
   - 分析两者矛盾解决方案的差异

2. 识别使用的TRIZ发明原理
   - 确定本专利使用了哪些TRIZ 40项发明原理
   - 确定对比专利使用了哪些TRIZ 40项发明原理
   - 比较两者在发明原理应用上的不同

3. 技术系统进化趋势分析
   - 基于TRIZ技术系统进化趋势评估两个专利
   - 判断哪个专利更符合系统进化的方向
   - 提出基于TRIZ原理的进一步优化建议

4. 理想解决方案(IFR)比较
   - 对比两个专利与理想最终解决方案的接近程度
   - 分析各自的资源利用效率
   - 评估系统简化程度

请提供专业、系统的TRIZ分析报告，突出创新点和技术差异。`;
  }
  
  // 初始化TRIZ按钮
  initTrizButton() {
    const trizBtn = document.querySelector('.search-btn');
    if (!trizBtn) return;
    
    // 检查权限
    const isUserLoggedIn = authService.isLoggedIn || window.currentUser;
    const isAdmin = authService.isAdmin();
    const isPro = authService.isPro();
    const hasAdvancedAccess = authService.hasAdvancedAccess();
    const roleBasedAccess = window.currentUser && (window.currentUser.role === 'admin' || window.currentUser.role === 'pro');
    
    // 设置按钮初始状态
    if (!authService.isOnline) {
      trizBtn.classList.add('disabled');
      trizBtn.disabled = true;
      trizBtn.title = "TRIZ模式 (需要在线连接)";
    } else if (!isUserLoggedIn) {
      trizBtn.classList.add('disabled');
      trizBtn.disabled = true;
      trizBtn.title = "TRIZ模式 (需要登录)";
    } else if (!(hasAdvancedAccess || roleBasedAccess)) {
      trizBtn.classList.add('disabled');
      trizBtn.disabled = true;
      trizBtn.title = "TRIZ模式 (需要Pro或管理员权限)";
    }
    
    // 添加点击事件
    trizBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // 直接检查authService的isLoggedIn状态，并作为第一选择
      // 同时增加对currentUser的兜底检查
      const isUserLoggedIn = authService.isLoggedIn || window.currentUser;
      
      // 记录当前登录状态，方便调试
      console.log('TRIZ按钮点击 - 登录状态检查:', { 
        authServiceIsLoggedIn: authService.isLoggedIn,
        windowCurrentUser: !!window.currentUser,
        combinedResult: isUserLoggedIn,
        currentUserRole: window.currentUser?.role || '未登录'
      });
      
      // 首先检查是否已登录
      if (!isUserLoggedIn) {
        app.showMessage('请先登录后使用功能', 'warning');
        // 添加登录提示到控制台
        console.error('TRIZ模式需要登录后使用');
        return;
      }
      
      // 检查是否为管理员或pro用户
      const isAdmin = authService.isAdmin();
      const isPro = authService.isPro();
      const hasAdvancedAccess = authService.hasAdvancedAccess();
      const roleBasedAccess = window.currentUser && (window.currentUser.role === 'admin' || window.currentUser.role === 'pro');
      
      // 记录权限检查信息
      console.log('TRIZ按钮权限检查:', { 
        isAdmin, 
        isPro, 
        hasAdvancedAccess, 
        roleBasedAccess,
        userRole: window.currentUser?.role || '未知'
      });
      
      // 如果有任一高级权限，直接使用TRIZ模式
      if (hasAdvancedAccess || roleBasedAccess) {
        // 有权限直接切换TRIZ模式
        this.toggleTrizMode();
        console.log('高级用户直接切换TRIZ模式');
        return;
      }
      
      // 检查在线状态
      if (!authService.isOnline) {
        app.showMessage('TRIZ模式需要在线连接，请稍后再试', 'warning');
        return;
      }
      
      // 权限不足提示
      app.showMessage('TRIZ模式仅对管理员和Pro用户开放，请升级账户', 'warning');
      console.log('权限不足: 普通用户尝试使用TRIZ模式');
    });
  }
  
  // 添加提交按钮事件监听
  initSubmitButtonListener() {
    const submitBtn = document.querySelector('.submit-btn');
    if (!submitBtn) return;
    
    submitBtn.addEventListener('click', (e) => {
      // 只有在TRIZ模式激活时才执行分析
      if (this.isActive) {
        console.log('TRIZ模式: 检测到内容提交，准备分析');
        // 延迟执行分析，确保内容已经提交到聊天区域
        setTimeout(() => {
          this.analyzePatents();
        }, 500);
      }
    });
    
    // 同时监听输入框的回车键
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && this.isActive) {
          console.log('TRIZ模式: 检测到Enter键提交，准备分析');
          // 延迟执行分析，确保内容已经提交到聊天区域
          setTimeout(() => {
            this.analyzePatents();
          }, 500);
        }
      });
    }
  }
  
  // 切换TRIZ模式状态
  toggleTrizMode() {
    // 如果能执行到这一步，说明之前的登录检查已经通过，无需再次检查
    const trizBtn = document.querySelector('.search-btn');
    
    // 切换状态
    if (!this.isActive) {
      // 激活TRIZ模式
      this.isActive = true;
      trizBtn.classList.add('active');
      
      // 确保图标和文本颜色更改为蓝色
      const trizIcon = trizBtn.querySelector('i');
      const trizText = trizBtn.querySelector('span');
      
      if (trizIcon) trizIcon.style.color = '#4a7bff';
      if (trizText) trizText.style.color = '#4a7bff';
      
      // 全局变量更新，确保与script.js中的handleSubmit函数兼容
      if (window.deepSearchToggle) {
        window.deepSearchToggle.checked = true;
      }
      
      console.log('TRIZ模式: 已开启，等待用户提交专利内容');
    } else {
      // 关闭TRIZ模式
      this.isActive = false;
      trizBtn.classList.remove('active');
      
      // 恢复图标和文本默认颜色
      const trizIcon = trizBtn.querySelector('i');
      const trizText = trizBtn.querySelector('span');
      
      if (trizIcon) trizIcon.style.color = '';
      if (trizText) trizText.style.color = '';
      
      // 全局变量更新，确保与script.js中的handleSubmit函数兼容
      if (window.deepSearchToggle) {
        window.deepSearchToggle.checked = false;
      }
      
      console.log('TRIZ模式: 已关闭');
      // 清除TRIZ提示词
      this.clearTrizPrompt();
    }
  }
  
  // 清除TRIZ提示词
  clearTrizPrompt() {
    if (apiService && typeof apiService.clearSystemPrompt === 'function') {
      apiService.clearSystemPrompt();
      console.log('TRIZ模式: 已清除TRIZ分析提示词');
    }
  }
  
  // 分析专利
  analyzePatents() {
    try {
      // 确保已登录
      const isUserLoggedIn = authService.isLoggedIn || window.currentUser;
      if (!isUserLoggedIn) {
        console.error('TRIZ模式: 未登录状态，无法分析内容');
        return;
      }
      
      // 获取聊天内容作为专利数据
      const patentContent = this.getChatContent();
      
      if (patentContent) {
        console.log('TRIZ模式: 分析专利内容');
        this.performTrizAnalysis(patentContent);
      } else {
        console.log('TRIZ模式: 没有检测到专利内容');
      }
    } catch (error) {
      console.error('TRIZ模式分析错误:', error);
    }
  }
  
  // 获取聊天框内容
  getChatContent() {
    // 获取聊天历史或当前输入框内容
    const chatHistory = window.chatHistory || [];
    if (chatHistory.length > 0) {
      // 合并最近的聊天内容（最多5条）
      return chatHistory.slice(-5).map(msg => msg.content).join('\n');
    }
    
    // 尝试获取当前输入框内容
    const inputElement = document.querySelector('#chat-input');
    if (inputElement && inputElement.value.trim()) {
      return inputElement.value.trim();
    }
    
    return null;
  }
  
  // 执行TRIZ分析
  async performTrizAnalysis(content) {
    // 直接使用auth服务检查，并添加详细的登录状态日志
    const isUserLoggedIn = authService.isLoggedIn || window.currentUser;
    
    console.log('执行TRIZ分析 - 登录状态检查:', { 
      authServiceIsLoggedIn: authService.isLoggedIn,
      windowCurrentUser: !!window.currentUser,
      combinedResult: isUserLoggedIn,
      currentUserRole: window.currentUser?.role || '未登录',
      isAdmin: authService.isAdmin(),
      isPro: authService.isPro(),
      hasAdvancedAccess: authService.hasAdvancedAccess()
    });
    
    // 检查登录状态
    if (!isUserLoggedIn) {
      console.error('TRIZ模式: 用户未登录，无法执行分析');
      return;
    }
    
    // 检查在线状态
    if (!authService.isOnline) {
      console.error('TRIZ模式: 系统离线，无法执行分析');
      return;
    }
    
    // 设置TRIZ分析提示词
    apiService.setSystemPrompt(this.TRIZ_ANALYSIS_PROMPT);
    console.log('TRIZ模式: 已设置TRIZ分析提示词');
    
    // 设置当前分析模式为triz
    if (typeof window.handleSubmit === 'function') {
      // 创建一个合成事件对象
      const syntheticEvent = {
        preventDefault: function() {},
        trizMode: true  // 标记这是一个TRIZ模式事件
      };
      
      // 调用全局的handleSubmit函数，处理提交
      window.handleSubmit(syntheticEvent);
    }
  }
  
  // 获取TRIZ提示词
  getTrizPrompt() {
    return this.TRIZ_ANALYSIS_PROMPT;
  }
  
  // 刷新按钮状态
  refreshButtonState() {
    const trizBtn = document.querySelector('.search-btn');
    if (!trizBtn) return;
    
    // 移除之前的状态
    trizBtn.classList.remove('disabled');
    trizBtn.disabled = false;
    trizBtn.title = "TRIZ创新思维";
    
    // 检查权限
    const isUserLoggedIn = authService.isLoggedIn || window.currentUser;
    const hasAdvancedAccess = authService.hasAdvancedAccess();
    const roleBasedAccess = window.currentUser && (window.currentUser.role === 'admin' || window.currentUser.role === 'pro');
    
    // 设置按钮状态
    if (!authService.isOnline) {
      trizBtn.classList.add('disabled');
      trizBtn.disabled = true;
      trizBtn.title = "TRIZ模式 (需要在线连接)";
    } else if (!isUserLoggedIn) {
      trizBtn.classList.add('disabled');
      trizBtn.disabled = true;
      trizBtn.title = "TRIZ模式 (需要登录)";
    } else if (!(hasAdvancedAccess || roleBasedAccess)) {
      trizBtn.classList.add('disabled');
      trizBtn.disabled = true;
      trizBtn.title = "TRIZ模式 (需要Pro或管理员权限)";
    }
    
    console.log('TRIZ按钮状态已刷新');
  }
  
  // 同步按钮状态和deepSearchToggle
  syncButtonState() {
    setTimeout(() => {
      const trizBtn = document.querySelector('.search-btn');
      if (!trizBtn) return;
      
      // 如果deepSearchToggle存在并且已选中，使按钮处于激活状态
      if (window.deepSearchToggle && window.deepSearchToggle.checked) {
        this.isActive = true;
        trizBtn.classList.add('active');
        
        // 确保图标和文本颜色更改为蓝色
        const trizIcon = trizBtn.querySelector('i');
        const trizText = trizBtn.querySelector('span');
        
        if (trizIcon) trizIcon.style.color = '#4a7bff';
        if (trizText) trizText.style.color = '#4a7bff';
        
        console.log('初始化TRIZ按钮状态为激活');
      } else {
        this.isActive = false;
        trizBtn.classList.remove('active');
        
        // 恢复图标和文本默认颜色
        const trizIcon = trizBtn.querySelector('i');
        const trizText = trizBtn.querySelector('span');
        
        if (trizIcon) trizIcon.style.color = '';
        if (trizText) trizText.style.color = '';
        
        console.log('初始化TRIZ按钮状态为未激活');
      }
    }, 500); // 稍微延迟，确保DOM和deepSearchToggle已初始化
  }
}

// 创建TRIZ服务实例
const trizService = new TrizModeService();

// 监听登录状态变化
document.addEventListener('user-login-status-changed', () => {
  trizService.refreshButtonState();
});

// 导出服务
window.trizService = trizService; 