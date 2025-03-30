// thinkMode.js
class ThinkModeService {
  constructor() {
    this.isActive = false;
    this.initialized = false;
    this.promptsConfig = null;
    
    // 在页面加载时初始化Think按钮事件
    document.addEventListener('DOMContentLoaded', () => {
      this.initThinkButton();
      this.loadPromptsConfig();
    });
  }
  
  // 加载提示词配置
  async loadPromptsConfig() {
    try {
      this.promptsConfig = await loadPromptsConfig();
      console.log('提示词配置已加载');
    } catch (error) {
      console.error('加载提示词配置失败:', error);
    }
  }
  
  // 初始化Think按钮
  initThinkButton() {
    const thinkBtn = document.querySelector('.think-btn');
    if (!thinkBtn) return;
    
    // 设置按钮初始状态
    if (!authService.isOnline) {
      thinkBtn.classList.add('disabled');
      thinkBtn.disabled = true;
      thinkBtn.title = "思考模式 (需要在线连接)";
    }
    
    // 添加点击事件 - 开关模式
    thinkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // 先检查登录状态
      if (!authService.isLoggedIn) {
        app.showMessage('请先登录后使用功能', 'warning');
        return;
      }
      
      // 再检查在线状态
      if (!authService.isOnline) {
        app.showMessage('Think模式需要在线连接，请稍后再试', 'warning');
        return;
      }
      
      // 管理员直接允许使用所有功能
      // 普通用户功能受限，但基本对话功能应该都可用
      this.toggleThinkMode(thinkBtn);
    });
    
    // 初始化文件上传监听
    this.initFileUploadListener();
    
    // 初始化输入框监听
    this.initInputListener();
  }
  
  // 切换思考模式状态
  toggleThinkMode(button) {
    this.isActive = !this.isActive;
    
    if (this.isActive) {
      button.classList.add('active');
      button.title = "思考模式已开启";
      app.showMessage('思考模式已开启，将自动识别专利相关内容', 'success');
    } else {
      button.classList.remove('active');
      button.title = "思考模式";
      app.showMessage('思考模式已关闭', 'info');
    }
    
    this.initialized = true;
  }
  
  // 初始化文件上传监听
  initFileUploadListener() {
    const fileInput = document.getElementById('file-input');
    if (!fileInput) return;
    
    fileInput.addEventListener('change', async (e) => {
      if (!this.isActive) return; // 如果思考模式未开启，直接返回
      
      const file = e.target.files[0];
      if (!file) return;
      
      // 处理文件内容
      try {
        const content = await this.extractFileContent(file);
        if (content) {
          // 分析内容类型
          const contentType = this.analyzeContentType(content);
          // 如果是专利相关内容，添加相应提示词
          if (contentType) {
            app.showMessage(`已识别为${contentType.name}内容，将使用专业提示词`, 'info');
            app.showContentTypeIndicator(contentType);
            
            // 获取并应用提示词
            const prompt = this.getPromptByContentType(content, contentType);
            if (prompt) {
              this.applyPromptToChat(prompt);
            }
          }
        }
      } catch (error) {
        console.error('处理文件内容失败:', error);
        app.showMessage('处理文件内容失败: ' + error.message, 'error');
      }
    });
  }
  
  // 初始化输入框监听
  initInputListener() {
    const chatInput = document.getElementById('chat-input');
    if (!chatInput) return;
    
    // 使用防抖处理输入
    let debounceTimer;
    chatInput.addEventListener('input', (e) => {
      if (!this.isActive) return; // 如果思考模式未开启，直接返回
      
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const content = e.target.value;
        if (content.length > 50) { // 只有内容足够长时才分析
          const contentType = this.analyzeContentType(content);
          // 如果是专利相关内容，应用提示词
          if (contentType) {
            console.log(`已识别为${contentType.name}内容，将使用专业提示词`);
            app.showContentTypeIndicator(contentType);
            
            // 获取提示词（但不自动应用到输入框，因为用户正在输入）
            const prompt = this.getPromptByContentType(content, contentType);
            if (prompt) {
              // 只设置系统提示词，不修改用户输入
              apiService.setSystemPrompt(prompt.system);
            }
          }
        }
      }, 1000); // 1秒防抖
    });
    
    // 监听提交事件
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
      const originalClickHandler = submitBtn.onclick;
      
      submitBtn.onclick = (e) => {
        if (this.isActive && chatInput.value.trim()) {
          const content = chatInput.value.trim();
          const contentType = this.analyzeContentType(content);
          
          // 如果是特定内容类型且尚未应用提示词，在提交前应用
          if (contentType && !apiService.systemPrompt) {
            const prompt = this.getPromptByContentType(content, contentType);
            if (prompt) {
              apiService.setSystemPrompt(prompt.system);
            }
          }
        }
        
        // 调用原始处理函数
        if (typeof originalClickHandler === 'function') {
          originalClickHandler.call(submitBtn, e);
        }
      };
    }
  }
  
  // 提取文件内容
  async extractFileContent(file) {
    if (!file) return null;
    
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    
    // 根据文件类型提取内容
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await this.extractPdfContent(file);
    } else if (fileType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      return await this.extractWordContent(file);
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return await this.extractTextContent(file);
    } else {
      throw new Error('不支持的文件类型');
    }
  }
  
  // 提取PDF内容
  async extractPdfContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function(event) {
        try {
          const typedArray = new Uint8Array(event.target.result);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            text += strings.join(' ') + '\n';
          }
          
          resolve(text);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  
  // 提取Word文档内容
  async extractWordContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const arrayBuffer = event.target.result;
        
        mammoth.extractRawText({arrayBuffer: arrayBuffer})
          .then(result => {
            resolve(result.value);
          })
          .catch(reject);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  
  // 提取文本内容
  async extractTextContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        resolve(event.target.result);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
  
  // 分析内容类型
  analyzeContentType(content) {
    if (!content || typeof content !== 'string') return null;
    
    const lowerContent = content.toLowerCase();
    
    // 检测是否是审查意见通知书
    if (lowerContent.includes('审查意见通知书') || 
        lowerContent.includes('驳回理由') || 
        lowerContent.includes('实质审查') ||
        (lowerContent.includes('专利') && lowerContent.includes('审查'))) {
      return {
        type: 'patent_review',
        name: '专利答审'
      };
    }
    
    // 检测是否是专利撰写
    if ((lowerContent.includes('专利') && lowerContent.includes('撰写')) ||
        lowerContent.includes('新申请') ||
        lowerContent.includes('权利要求') ||
        (lowerContent.includes('技术方案') && lowerContent.includes('说明书'))) {
      return {
        type: 'patent_writing',
        name: '专利撰写'
      };
    }
    
    return null;
  }
  
  // 根据内容类型获取提示词
  getPromptByContentType(content, contentType) {
    if (!this.promptsConfig || !contentType) return null;
    
    const promptTemplate = this.promptsConfig[contentType.type];
    if (!promptTemplate) return null;
    
    // 替换模板中的占位符
    let userPrompt = promptTemplate.user_template.replace('{{content}}', content);
    
    // 如果是专利撰写，尝试识别技术领域
    if (contentType.type === 'patent_writing') {
      const field = this.recognizeField(content) || '一般技术';
      userPrompt = userPrompt.replace('{{field}}', field);
    }
    
    return {
      system: promptTemplate.system,
      user: userPrompt
    };
  }
  
  // 识别技术领域（简化版）
  recognizeField(content) {
    const lowerContent = content.toLowerCase();
    
    // 简单的技术领域识别逻辑
    if (lowerContent.includes('软件') || lowerContent.includes('程序') || lowerContent.includes('算法')) {
      return '软件技术';
    } else if (lowerContent.includes('机械') || lowerContent.includes('器件') || lowerContent.includes('装置')) {
      return '机械技术';
    } else if (lowerContent.includes('电子') || lowerContent.includes('集成电路') || lowerContent.includes('芯片')) {
      return '电子技术';
    } else if (lowerContent.includes('化学') || lowerContent.includes('材料') || lowerContent.includes('分子')) {
      return '化学材料';
    } else if (lowerContent.includes('生物') || lowerContent.includes('医药') || lowerContent.includes('基因')) {
      return '生物医药';
    }
    
    return null;
  }
  
  // 应用提示词到对话
  applyPromptToChat(prompt) {
    if (!prompt) return false;
    
    try {
      // 将系统提示词添加到API服务
      apiService.setSystemPrompt(prompt.system);
      
      // 如果还有用户提示词模板，可以添加到输入框
      const chatInput = document.getElementById('chat-input');
      if (chatInput && prompt.user) {
        if (chatInput.value.trim() === '') {
          chatInput.value = prompt.user;
        } else {
          // 可以选择是否覆盖或追加
          if (confirm('是否用专业提示词替换当前输入内容？')) {
            chatInput.value = prompt.user;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('应用提示词失败:', error);
      return false;
    }
  }
}

// 创建单例实例
const thinkModeService = new ThinkModeService();