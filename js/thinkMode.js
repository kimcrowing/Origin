// thinkMode.js
class ThinkModeService {
  constructor() {
    this.isActive = false;
    this.container = null;
    this.initialized = false;
    
    // 在页面加载时初始化Think按钮事件
    document.addEventListener('DOMContentLoaded', () => {
      this.initThinkButton();
    });
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
    
    // 添加点击事件
    thinkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      if (!authService.isLoggedIn) {
        app.showMessage('请先登录后使用Think模式', 'warning');
        return;
      }
      
      if (!authService.isOnline) {
        app.showMessage('Think模式需要在线连接，请稍后再试', 'warning');
        return;
      }
      
      this.openThinkMode();
    });
  }
  
  // 打开Think模式
  openThinkMode() {
    // 如果没有登录或离线，不允许开启
    if (!authService.isLoggedIn || !authService.isOnline) {
      return;
    }
    
    // 创建或显示Think模式弹窗
    if (!this.container) {
      this.createThinkModeDialog();
    } else {
      this.container.style.display = 'block';
    }
    
    if (!this.initialized) {
      this.setupThinkEvents();
      this.initialized = true;
    }
  }
  
  // 创建Think模式对话框
  createThinkModeDialog() {
    // 创建对话框容器
    this.container = document.createElement('div');
    this.container.className = 'think-dialog';
    this.container.innerHTML = `
      <div class="think-dialog-content">
        <div class="think-dialog-header">
          <h3>Think深度分析模式</h3>
          <button class="think-close-btn"><i class="fas fa-times"></i></button>
        </div>
        <div class="think-dialog-body">
          <p class="think-description">
            Think模式提供深度分析和推理，帮助解决复杂问题。
            输入您的问题，系统将进行综合分析并提供详细解答。
          </p>
          <div class="think-input-container">
            <textarea id="think-input" placeholder="输入复杂问题进行深度分析..."></textarea>
          </div>
          <div class="think-controls">
            <button id="think-submit-btn" class="btn btn-primary">
              <i class="fas fa-brain"></i> 开始分析
            </button>
          </div>
          <div id="think-result-area" class="think-result-area">
            <div class="think-placeholder">您的分析结果将显示在这里</div>
          </div>
        </div>
      </div>
    `;
    
    // 添加到页面
    document.body.appendChild(this.container);
  }
  
  // 设置Think模式的事件处理
  setupThinkEvents() {
    // 关闭按钮
    const closeBtn = this.container.querySelector('.think-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.container.style.display = 'none';
      });
    }
    
    // 提交按钮
    const submitBtn = this.container.querySelector('#think-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const input = this.container.querySelector('#think-input');
        if (input && input.value.trim()) {
          this.performThinkAnalysis(input.value.trim());
        } else {
          app.showMessage('请输入需要分析的问题', 'warning');
        }
      });
    }
    
    // 点击对话框外部关闭
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.container.style.display = 'none';
      }
    });
  }
  
  // 执行Think分析
  async performThinkAnalysis(query) {
    // 检查在线状态
    if (!authService.isOnline) {
      app.showMessage('Think模式需要在线连接', 'error');
      return;
    }
    
    const resultArea = this.container.querySelector('#think-result-area');
    if (!resultArea) return;
    
    // 显示加载动画
    resultArea.innerHTML = `
      <div class="think-loading">
        <div class="think-spinner"></div>
        <p>正在进行深度分析，这可能需要一些时间...</p>
      </div>
    `;
    
    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 这里应该是真实的API调用，现在用模拟响应代替
      const response = this.generateThinkResponse(query);
      
      // 显示结果
      resultArea.innerHTML = `
        <div class="think-result">
          <div class="think-result-header">
            <h4>分析结果</h4>
            <div class="think-result-actions">
              <button class="btn-copy-result"><i class="fas fa-copy"></i> 复制</button>
            </div>
          </div>
          <div class="think-result-content">
            ${this.formatThinkResult(response.analysis)}
          </div>
        </div>
      `;
      
      // 添加复制功能
      const copyBtn = resultArea.querySelector('.btn-copy-result');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          this.copyToClipboard(response.analysis);
        });
      }
      
    } catch (error) {
      console.error('Think分析失败:', error);
      resultArea.innerHTML = `
        <div class="think-error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>分析过程中发生错误，请稍后再试</p>
        </div>
      `;
    }
  }
  
  // 生成模拟的Think响应
  generateThinkResponse(query) {
    // 这是一个模拟的响应生成器，实际应用中应该调用后端API
    return {
      id: Date.now(),
      query: query,
      analysis: `**深度分析结果**\n\n针对您的问题："${query}"\n\n我们进行了深度思考，分析如下：\n\n1. 首先，这个问题涉及到多个领域的知识\n2. 根据最新的研究数据表明，这类问题通常需要从多角度思考\n3. 考虑到各种因素的影响，我们可以得出以下几点结论...\n\n*补充思考*：在考虑未来发展趋势时，需要注意潜在的变化因素\n\n总结：这是一个需要综合多方面因素的复杂问题，建议从长远角度制定解决方案。`,
      timestamp: new Date().toISOString()
    };
  }
  
  // 格式化Think结果
  formatThinkResult(text) {
    if (!text) return '';
    
    // 简单的Markdown格式化
    return text
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }
  
  // 复制到剪贴板
  copyToClipboard(text) {
    // 创建临时元素
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = 0;
    
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      // 执行复制命令
      const successful = document.execCommand('copy');
      if (successful) {
        app.showMessage('分析结果已复制到剪贴板', 'success');
      } else {
        app.showMessage('复制失败，请手动复制', 'error');
      }
    } catch (err) {
      console.error('复制失败:', err);
      app.showMessage('复制失败，请手动复制', 'error');
    }
    
    document.body.removeChild(textarea);
  }
}

// 创建并导出Think模式服务实例
const thinkModeService = new ThinkModeService(); 