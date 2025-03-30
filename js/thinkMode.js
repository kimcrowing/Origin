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
      console.log('Think模式: 未登录或离线状态，无法开启');
      return;
    }
    
    const thinkBtn = document.querySelector('.think-btn');
    
    // 创建或显示Think模式弹窗
    if (!this.container) {
      this.createThinkModeDialog();
      this.isActive = true;
      thinkBtn.classList.add('active');
      console.log('Think模式: 已创建并开启');
    } else {
      if (this.container.style.display === 'none') {
        this.container.style.display = 'block';
        this.isActive = true;
        thinkBtn.classList.add('active');
        console.log('Think模式: 已开启');
      } else {
        this.container.style.display = 'none';
        this.isActive = false;
        thinkBtn.classList.remove('active');
        console.log('Think模式: 已关闭');
        return;
      }
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
        this.isActive = false;
        const thinkBtn = document.querySelector('.think-btn');
        if (thinkBtn) thinkBtn.classList.remove('active');
        console.log('Think模式: 已关闭');
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
        this.isActive = false;
        const thinkBtn = document.querySelector('.think-btn');
        if (thinkBtn) thinkBtn.classList.remove('active');
        console.log('Think模式: 已关闭');
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
        model,  // 使用思考模型
        []      // 思考模式不使用历史上下文，传递空数组
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
  
  // 识别技术领域（增强版2.0）
  recognizeField(content) {
    if (!content || typeof content !== 'string') return null;
    
    const lowerContent = content.toLowerCase();
    
    // 创建关键词计数器
    const fieldScores = {
      '计算机软件技术': 0,
      '机械工程技术': 0,
      '电子电气技术': 0,
      '通信网络技术': 0,
      '化学材料技术': 0,
      '生物医药技术': 0,
      '能源环保技术': 0,
      '光学技术': 0,
      '半导体技术': 0,
      '人工智能技术': 0,
      '物联网技术': 0,
      '自动化控制技术': 0
    };
    
    // 软件与计算机技术关键词
    const softwareKeywords = [
      '软件', '程序', '算法', '计算机', '数据库', 'api', '接口', '编程', '代码',
      '开发', '系统架构', '前端', '后端', '全栈', '系统集成', '软件工程', '编译',
      '解释器', '虚拟机', '操作系统', '网络安全', '数据结构', '服务器', '微服务',
      '分布式', '并行计算', 'web', '网页', '脚本', '框架', '库', '插件', '模块',
      'sdk', 'api', 'ide', '版本控制', 'git', '持续集成', '自动化测试', '调试'
    ];
    
    // 人工智能技术关键词
    const aiKeywords = [
      '人工智能', '机器学习', '深度学习', '神经网络', '自然语言处理', 'nlp',
      '计算机视觉', '图像识别', '语音识别', '决策树', '随机森林', '支持向量机',
      '强化学习', '无监督学习', '有监督学习', '半监督学习', '迁移学习', '生成对抗网络',
      'gan', '卷积神经网络', 'cnn', '递归神经网络', 'rnn', 'lstm', '注意力机制',
      '知识图谱', '专家系统', '模式识别', '数据挖掘', '特征工程', '向量化', '分类器',
      '回归分析', '聚类分析', 'transformer', 'bert', 'gpt', '预训练模型', '语义分析',
      '情感分析', '命名实体识别', '文本分类', '推荐系统', '大语言模型', 'llm'
    ];
    
    // 机械技术关键词
    const mechanicalKeywords = [
      '机械', '器件', '装置', '设备', '机构', '零部件', '传动', '流体', '液压', '气动',
      '机构', '齿轮', '轴承', '连杆', '阀门', '泵', '密封', '润滑', '冷却', '加工',
      '铸造', '锻造', '焊接', '切削', '磨削', '车床', '铣床', '刨床', '钻床', '工业设计',
      '机械制图', '3d打印', '增材制造', '机加工', '材料力学', '应力分析', '热动力学',
      '摩擦', '磨损', '疲劳', '断裂', '弹性', '塑性', '刚度', '强度', '工装夹具',
      '模具', '压铸', '冲压', '拉伸', '弯曲', '剪切', '法兰', '联轴器', '离合器',
      '制动器', '轴', '螺栓', '螺母', '机床', '数控', 'cnc', '自动化生产线'
    ];
    
    // 电子电气技术关键词
    const electronicsKeywords = [
      '电子', '集成电路', '芯片', '电路', '半导体', '传感器', '信号处理',
      '电力', '功率', '微电子', '电阻', '电容', '电感', '晶体管', '二极管',
      '三极管', '场效应管', '放大器', '振荡器', '滤波器', '变压器', '开关电源',
      'pcb', '印刷电路板', '电路设计', '数字电路', '模拟电路', '混合信号',
      '电磁兼容', 'emc', '静电放电', 'esd', '电源管理', '布线', '接地', '屏蔽',
      '光电', '光电子', '发光二极管', 'led', '光敏元件', '光电二极管', '光电管',
      '光电倍增管', '驱动电路', '保护电路', '电流', '电压', '功率因数', '谐波',
      '整流', '逆变', '稳压', '降压', '升压', '恒流', '恒压', '数模转换', '模数转换',
      'adc', 'dac', '脉宽调制', 'pwm', '电机驱动', '步进电机', '伺服电机'
    ];
    
    // 半导体技术关键词
    const semiconductorKeywords = [
      '半导体', '硅', '硅片', '掺杂', '离子注入', '光刻', '刻蚀', '沉积', '扩散',
      '氧化', '退火', '金属化', '封装', '晶圆', '晶体管', '集成电路', 'ic', '芯片',
      '芯片设计', '版图设计', '前端设计', '后端设计', '工艺', '制程', '良率',
      '测试', '烧录', '封装', '引线键合', '焊线', '凸点', '倒装芯片', 'cmos',
      'mos', '门电路', '寄存器', '触发器', '存储器', 'ram', 'rom', 'dram', 'sram',
      'flash', '非易失性存储器', 'nvm', '单晶', '多晶', '非晶', '外延', '三维集成',
      '功率半导体', 'igbt', '肖特基二极管', '变容二极管', '晶闸管', '功率mos管'
    ];
    
    // 通信技术关键词
    const communicationKeywords = [
      '通信', '5g', '网络', '无线', '路由', '协议', '数据传输', '基站', '移动通信',
      '调制', '解调', '编码', '解码', '频率', '带宽', '信道', '复用', '多址', '扩频',
      '跳频', '直扩', '天线', '波导', '微波', '毫米波', '光通信', '光纤', '光缆',
      '光波导', '光调制', '光检测', '光放大器', '波分复用', '时分复用', '码分复用',
      '频分复用', '空分复用', '多输入多输出', 'mimo', '载波聚合', '干扰抑制',
      '衰减', '噪声', '信噪比', '误码率', '吞吐量', '时延', '路径损耗', '多径效应',
      '多普勒效应', '信令', '同步', '异步', '握手', '路由', '交换', '网关', '防火墙',
      '局域网', '广域网', '城域网', '个人区域网', 'lan', 'wan', 'man', 'pan',
      'tcp/ip', 'http', 'udp', 'ftp', 'ipv4', 'ipv6', '以太网', '蓝牙', 'wifi',
      'nfc', 'rfid', 'zigbee', 'lora', 'nb-iot', 'lte', 'cdma', 'gsm', 'tdma'
    ];
    
    // 物联网技术关键词
    const iotKeywords = [
      '物联网', 'iot', '传感网络', '嵌入式系统', '远程监控', '智能家居', '智能穿戴',
      '智能设备', '智能传感器', '低功耗', '边缘计算', '雾计算', '分布式计算',
      'mqtt', 'coap', 'amqp', 'dds', '实时数据', '数据采集', '数据融合',
      '设备管理', '设备接入', '物联网平台', '物联网网关', '无线传感器网络', 'wsn',
      '近场通信', '无线射频', '自组网', '自适应', '能量收集', '远程控制',
      '物理信息系统', 'cps', '设备互联', '物物互联', 'm2m', '数字孪生', '智能制造'
    ];
    
    // 光学技术关键词
    const opticsKeywords = [
      '光学', '激光', '镜头', '透镜', '光纤', '光栅', '衍射', '干涉', '偏振',
      '折射', '反射', '准直', '聚焦', '像差', '色散', '光源', '发光', '光谱',
      '光电', '光导', '光学系统', '全息', '显微镜', '望远镜', '照相机', '投影仪',
      '光学设计', '光学镀膜', '光学检测', '光学测量', '光路', '光束', '光强',
      '波长', '频率', '相位', '相干', '非相干', '单色', '多色', '可见光',
      '红外', '紫外', '近红外', '中红外', '远红外', '近紫外', '深紫外',
      '极紫外', '光电子', '光电倍增管', '光电二极管', '光敏电阻'
    ];
    
    // 化学材料技术关键词
    const chemicalKeywords = [
      '化学', '材料', '分子', '聚合物', '合成', '催化', '涂层', '复合材料', '纳米',
      '有机化学', '无机化学', '物理化学', '分析化学', '高分子化学', '表面化学',
      '胶体化学', '电化学', '光化学', '热化学', '量子化学', '生物化学', '材料科学',
      '材料工程', '金属材料', '非金属材料', '功能材料', '结构材料', '复合材料',
      '智能材料', '纳米材料', '薄膜材料', '粉末冶金', '表面处理', '热处理',
      '腐蚀防护', '焊接', '粘接', '涂装', '镀层', '沉积', '浸渍', '溶胶-凝胶',
      '水解', '缩聚', '加成', '聚合', '缩合', '交联', '交联剂', '固化', '增塑',
      '增韧', '阻燃', '抗氧化', '抗老化', '稳定剂', '助剂', '添加剂', '填料',
      '增强剂', '颜料', '染料', '油墨', '涂料', '胶粘剂', '密封剂', '绝缘材料',
      '导电材料', '半导体材料', '磁性材料', '光电材料', '压电材料', '热电材料'
    ];
    
    // 生物医药技术关键词
    const biomedKeywords = [
      '生物', '医药', '基因', '蛋白质', '药物', '治疗', '诊断', '医疗器械', '生物技术',
      '分子生物学', '细胞生物学', '微生物学', '免疫学', '病理学', '遗传学',
      '生物化学', '生物物理学', '生物信息学', '组织工程', '基因工程', '基因编辑',
      '基因治疗', '基因检测', '基因表达', '基因组', '蛋白质组', '代谢组',
      '酶', '抗体', '抗原', '受体', '配体', '激素', '细胞因子', '生长因子',
      '疫苗', '抗生素', '抗病毒', '抗炎', '抗肿瘤', '靶向药物', '小分子药物',
      '大分子药物', '生物药', '化学药', '中药', '天然药物', '新药', '仿制药',
      '原料药', '制剂', '剂型', '片剂', '胶囊', '注射剂', '口服液', '贴剂',
      '雾化剂', '吸入剂', '药代动力学', '药效学', '毒理学', '药理学',
      '临床试验', '临床前', 'GMP', 'GLP', '药品注册', '药品审批', 'FDA',
      'NMPA', '医疗设备', '医疗器械', '体外诊断', '影像设备', '监测设备',
      '治疗设备', '康复设备', '植入物', '人工器官', '医用耗材'
    ];
    
    // 能源环境技术关键词
    const energyEnvKeywords = [
      '能源', '环保', '可再生', '太阳能', '风能', '电池', '储能', '污染', '净化',
      '水力发电', '风力发电', '太阳能发电', '光伏', '光热', '生物质能', '地热能',
      '潮汐能', '波浪能', '氢能', '核能', '化石能源', '煤炭', '石油', '天然气',
      '页岩气', '燃料电池', '锂电池', '铅酸电池', '镍氢电池', '镍镉电池',
      '钠硫电池', '液流电池', '超级电容器', '储能系统', '智能电网', '微电网',
      '分布式能源', '能源互联网', '能源管理', '节能', '减排', '碳中和',
      '碳达峰', '低碳', '零碳', '碳捕集', '碳封存', '碳利用', 'CCUS',
      '大气污染', '水污染', '土壤污染', '噪声污染', '光污染', '固体废物',
      '危险废物', '垃圾处理', '垃圾分类', '垃圾焚烧', '垃圾填埋', '垃圾回收',
      '资源回收', '资源循环', '循环经济', '清洁生产', '绿色制造', '环境监测',
      '环境评价', '环境管理', '环境保护', '生态修复', '水处理', '污水处理',
      '废气处理', '除尘', '脱硫', '脱硝', '催化剂', '吸附剂', '过滤材料'
    ];
    
    // 自动化控制技术关键词
    const automationKeywords = [
      '自动化', '控制', '机器人', '伺服', '传感器', '执行器', '自动控制',
      '过程控制', '反馈控制', '前馈控制', '比例积分微分', 'PID', '模糊控制',
      '神经网络控制', '自适应控制', '鲁棒控制', '预测控制', '最优控制',
      '状态反馈', '观测器', '卡尔曼滤波', '滤波器', '控制系统', '信号处理',
      '测量', '校准', '标定', '误差分析', '稳定性分析', '频率响应', '时域分析',
      '传递函数', '状态空间', '离散控制', '连续控制', '数字控制', '模拟控制',
      '可编程控制器', 'PLC', '分布式控制系统', 'DCS', '数据采集', 'SCADA',
      '工业控制网络', '现场总线', 'Modbus', 'Profibus', 'DeviceNet',
      'EtherCAT', '工业以太网', '工业4.0', '智能制造', '智能工厂', '数字孪生',
      '人机界面', 'HMI', '监控', '报警', '故障诊断', '容错控制', '安全控制',
      '冗余设计', '仪表仪器', '变送器', '检测器', '调节器', '控制阀',
      '执行机构', '驱动器', '变频器', '伺服驱动', '步进驱动', '电气设备',
      '配电系统', '继电保护', '开关设备', '负载管理', '电能质量'
    ];
    
    // 计算各领域的匹配得分
    for (const keyword of softwareKeywords) {
      if (lowerContent.includes(keyword)) {
        fieldScores['计算机软件技术'] += 1;
      }
    }
    
    for (const keyword of aiKeywords) {
      if (lowerContent.includes(keyword)) {
        fieldScores['人工智能技术'] += 1;
      }
    }
    
    for (const keyword of mechanicalKeywords) {
      if (lowerContent.includes(keyword)) {
        fieldScores['机械工程技术'] += 1;
      }
    }
    
    for (const keyword of electronicsKeywords) {
      if (lowerContent.includes(keyword)) {
        fieldScores['电子电气技术'] += 1;
      }
    }
    
    for (const keyword of semiconductorKeywords) {
      if (lowerContent.includes(keyword)) {
        fieldScores['半导体技术'] += 1;
      }
    }
    
    for (const keyword of communicationKeywords) {
      if (lowerContent.includes(keyword)) {
        fieldScores['通信网络技术'] += 1;
      }
    }
    
    for (const keyword of iotKeywords) {
      if (lowerContent.includes(keyword)) {
        fieldScores['物联网技术'] += 1;
      }
    }
    
    for (const keyword of opticsKeywords) {
      if (lowerContent.includes(keyword)) {
        fieldScores['光学技术'] += 1;
      }
    }
    
    for (const keyword of chemicalKeywords) {
      if (lowerContent.includes(keyword)) {
        fieldScores['化学材料技术'] += 1;
      }
    }
    
    for (const keyword of biomedKeywords) {
      if (lowerContent.includes(keyword)) {
        fieldScores['生物医药技术'] += 1;
      }
    }
    
    for (const keyword of energyEnvKeywords) {
      if (lowerContent.includes(keyword)) {
        fieldScores['能源环保技术'] += 1;
      }
    }
    
    for (const keyword of automationKeywords) {
      if (lowerContent.includes(keyword)) {
        fieldScores['自动化控制技术'] += 1;
      }
    }
    
    // 计算总匹配分数和最大匹配领域
    let totalScore = 0;
    let maxScore = 0;
    let maxField = '一般技术领域';
    let secondMaxScore = 0;
    let secondMaxField = '';
    
    for (const [field, score] of Object.entries(fieldScores)) {
      totalScore += score;
      
      if (score > maxScore) {
        secondMaxScore = maxScore;
        secondMaxField = maxField;
        maxScore = score;
        maxField = field;
      } else if (score > secondMaxScore) {
        secondMaxScore = score;
        secondMaxField = field;
      }
    }
    
    // 处理跨领域情况
    if (maxScore > 0 && secondMaxScore > 0) {
      // 如果第二高分至少达到最高分的70%，视为跨领域
      if (secondMaxScore >= maxScore * 0.7) {
        // 输出跨领域描述
        return `${maxField}与${secondMaxField}交叉领域`;
      }
    }
    
    // 如果没有明显匹配，返回一般技术领域
    if (maxScore === 0) {
      return '一般技术领域';
    }
    
    // 返回最匹配的领域
    return maxField;
  }
}

// 创建并导出Think模式服务实例
const thinkModeService = new ThinkModeService(); 