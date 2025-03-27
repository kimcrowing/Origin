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
            <label class="think-option">
              <input type="checkbox" id="think-show-process" checked>
              展示思考过程
            </label>
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
          const showProcess = this.container.querySelector('#think-show-process').checked;
          this.performThinkAnalysis(input.value.trim(), showProcess);
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
  async performThinkAnalysis(query, showProcess = true) {
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
      // 获取思考模型（从配置中）
      const model = apiService.config?.thinkingModel || apiService.config?.defaultModel;
      
      // 准备接收思考过程和结果
      let thinkingProcess = '';
      let finalResult = '';
      let isCompleted = false;
      
      // 创建结果区域
      resultArea.innerHTML = `
        <div class="think-result">
          <div class="think-result-header">
            <h4>分析进行中...</h4>
            <div class="think-progress">
              <div class="think-progress-animation">
                <div class="think-dot"></div>
                <div class="think-dot"></div>
                <div class="think-dot"></div>
              </div>
            </div>
          </div>
          ${showProcess ? `
          <div class="think-process-container">
            <div class="think-process-header">
              <span>思考过程</span>
              <button class="think-process-toggle">隐藏</button>
            </div>
            <div class="think-process-content"></div>
          </div>
          ` : ''}
          <div class="think-result-content">
            <div class="think-result-placeholder">
              <div class="think-dots-animation">
                <span class="think-dot"></span>
                <span class="think-dot"></span>
                <span class="think-dot"></span>
              </div>
            </div>
          </div>
          <div class="think-result-actions" style="display: none;">
            <button class="btn-copy-result"><i class="fas fa-copy"></i> 复制结果</button>
            <button class="btn-copy-all"><i class="fas fa-copy"></i> 复制全部</button>
            <button class="btn-add-to-chat"><i class="fas fa-plus"></i> 添加到对话</button>
          </div>
        </div>
      `;
      
      // 获取UI元素
      const resultContent = resultArea.querySelector('.think-result-content');
      const processContent = resultArea.querySelector('.think-process-content');
      const resultHeader = resultArea.querySelector('.think-result-header h4');
      const progressAnimation = resultArea.querySelector('.think-progress-animation');
      const actionsContainer = resultArea.querySelector('.think-result-actions');
      
      // 如果有思考过程切换按钮，设置事件
      const processToggle = resultArea.querySelector('.think-process-toggle');
      if (processToggle) {
        processToggle.addEventListener('click', () => {
          const container = resultArea.querySelector('.think-process-content');
          if (container.style.display === 'none') {
            container.style.display = 'block';
            processToggle.textContent = '隐藏';
          } else {
            container.style.display = 'none';
            processToggle.textContent = '显示';
          }
        });
      }
      
      // 开始流式分析
      await apiService.streamChatCompletion(
        query,
        // 处理每个响应片段
        (chunk) => {
          if (chunk.choices && chunk.choices[0]) {
            const delta = chunk.choices[0].delta;
            
            // 处理思考过程
            if (delta && delta.thinking) {
              thinkingProcess += delta.thinking;
              
              // 更新思考过程显示
              if (processContent) {
                processContent.innerHTML = this.formatThinkResult(thinkingProcess);
                // 自动滚动到底部
                processContent.scrollTop = processContent.scrollHeight;
              }
            }
            
            // 处理内容更新
            if (delta && delta.content) {
              // 移除占位符
              if (resultContent.querySelector('.think-result-placeholder')) {
                resultContent.innerHTML = '';
              }
              
              finalResult += delta.content;
              resultContent.innerHTML = this.formatThinkResult(finalResult);
              
              // 自动滚动到底部
              resultContent.scrollTop = resultContent.scrollHeight;
            }
          }
        },
        // 分析完成回调
        () => {
          isCompleted = true;
          
          // 更新标题
          if (resultHeader) {
            resultHeader.textContent = '分析完成';
          }
          
          // 移除动画
          if (progressAnimation) {
            // 替换为完成图标
            progressAnimation.innerHTML = '<i class="fas fa-check-circle" style="color: #4CAF50; font-size: 16px;"></i>';
          }
          
          // 显示操作按钮
          if (actionsContainer) {
            actionsContainer.style.display = 'flex';
            
            // 复制结果按钮
            const copyResultBtn = actionsContainer.querySelector('.btn-copy-result');
            if (copyResultBtn) {
              copyResultBtn.addEventListener('click', () => {
                this.copyToClipboard(finalResult);
                app.showMessage('分析结果已复制到剪贴板', 'success');
              });
            }
            
            // 复制全部按钮
            const copyAllBtn = actionsContainer.querySelector('.btn-copy-all');
            if (copyAllBtn) {
              copyAllBtn.addEventListener('click', () => {
                const fullContent = `思考过程:\n\n${thinkingProcess}\n\n最终结果:\n\n${finalResult}`;
                this.copyToClipboard(fullContent);
                app.showMessage('完整分析内容已复制到剪贴板', 'success');
              });
            }
            
            // 添加到对话按钮
            const addToChatBtn = actionsContainer.querySelector('.btn-add-to-chat');
            if (addToChatBtn) {
              addToChatBtn.addEventListener('click', () => {
                // 添加到主对话中
                if (typeof addMessageToUI === 'function') {
                  // 添加用户问题
                  addMessageToUI(query, 'user');
                  
                  // 添加AI回答
                  const aiResponse = finalResult;
                  addMessageToUI(aiResponse, 'ai');
                  
                  // 保存会话
                  if (typeof saveCurrentSession === 'function') {
                    saveCurrentSession();
                  }
                  
                  app.showMessage('已添加到主对话', 'success');
                  
                  // 关闭Think对话框
                  this.container.style.display = 'none';
                } else {
                  app.showMessage('无法添加到对话，请刷新页面重试', 'error');
                }
              });
            }
          }
          
          // 保存分析记录
          this.saveThinkResult(query, thinkingProcess, finalResult);
        },
        // 错误处理
        (error) => {
          console.error('Think分析出错:', error);
          
          // 更新错误显示
          if (resultHeader) {
            resultHeader.textContent = '分析出错';
          }
          
          // 更新动画为错误状态
          if (progressAnimation) {
            progressAnimation.innerHTML = '<i class="fas fa-exclamation-circle" style="color: #f44336; font-size: 16px;"></i>';
          }
          
          // 显示错误消息
          resultContent.innerHTML += `
            <div class="think-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>分析过程中发生错误: ${error.message}</p>
              <p>已保存部分分析结果</p>
            </div>
          `;
          
          // 如果有部分结果，还是显示操作按钮
          if (finalResult && actionsContainer) {
            actionsContainer.style.display = 'flex';
          }
          
          // 保存部分分析记录
          this.saveThinkResult(query, thinkingProcess, finalResult, error.message);
        },
        model  // 使用思考模型
      );
    } catch (error) {
      console.error('执行Think分析失败:', error);
      resultArea.innerHTML = `
        <div class="think-error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>分析过程中发生错误，请稍后再试</p>
          <p class="think-error-details">${error.message}</p>
        </div>
      `;
    }
  }
  
  // 保存思考分析结果
  saveThinkResult(query, thinking, result, error = null) {
    try {
      // 获取已有的分析历史
      let thinkHistory = JSON.parse(localStorage.getItem('think_history') || '[]');
      
      // 添加新的分析结果
      thinkHistory.unshift({
        id: Date.now(),
        query: query,
        thinking: thinking,
        result: result,
        error: error,
        timestamp: new Date().toISOString()
      });
      
      // 只保留最近的20条记录
      if (thinkHistory.length > 20) {
        thinkHistory = thinkHistory.slice(0, 20);
      }
      
      // 保存到本地存储
      localStorage.setItem('think_history', JSON.stringify(thinkHistory));
    } catch (e) {
      console.error('保存Think分析历史失败:', e);
    }
  }
  
  // 格式化Think结果
  formatThinkResult(text) {
    if (!text) return '';
    
    // 使用通用的Markdown格式化函数（如果存在）
    if (typeof formatMarkdown === 'function') {
      return formatMarkdown(text);
    }
    
    // 否则使用基本的格式化
    return text
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  }
  
  // 复制到剪贴板
  copyToClipboard(text) {
    // 使用现代clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          console.log('内容已复制到剪贴板');
        })
        .catch(err => {
          console.error('复制失败:', err);
          this.fallbackCopyToClipboard(text);
        });
    } else {
      this.fallbackCopyToClipboard(text);
    }
  }
  
  // 后备复制方法
  fallbackCopyToClipboard(text) {
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
        console.log('内容已复制到剪贴板(fallback)');
      } else {
        console.error('复制失败(fallback)');
      }
    } catch (err) {
      console.error('复制失败:', err);
    }
    
    document.body.removeChild(textarea);
  }
}

// 创建并导出Think模式服务实例
const thinkModeService = new ThinkModeService(); 