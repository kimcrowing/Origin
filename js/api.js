/**
 * Origin API服务
 * 封装与OpenRouter API的交互
 */

class ApiService {
    constructor() {
        this.config = null;
        this.isConfigLoaded = false;
    }

    /**
     * 初始化API服务
     */
    async init() {
        try {
            // 加载API配置
            this.config = await loadApiConfig();
            this.isConfigLoaded = true;
            console.log('API配置已成功加载');
        } catch (error) {
            console.error('API服务初始化失败:', error);
            this.isConfigLoaded = false;
        }
    }

    /**
     * 获取当前选择的模型
     * @returns {string} 当前模型ID
     */
    getCurrentModelId() {
        // 检查全局getCurrentModel函数是否存在
        if (typeof window.getCurrentModel === 'function') {
            return window.getCurrentModel();
        }
        // 否则使用配置中的默认模型
        return this.config?.defaultModel || 'deepseek/deepseek-r1-zero:free';
    }

    /**
     * 调用AI聊天API
     * @param {string} userMessage 用户消息
     * @param {string} model 使用的模型，不指定则使用默认模型
     * @param {boolean} stream 是否流式响应
     * @returns {Promise<Object>} API响应结果
     */
    async chatCompletion(userMessage, model = null, stream = false) {
        if (!this.isConfigLoaded || !this.config) {
            await this.init();
            if (!this.isConfigLoaded) {
                throw new Error('API配置未加载，无法调用API');
            }
        }

        try {
            // 准备请求参数
            const requestBody = {
                model: model || this.getCurrentModelId(),
                messages: [{ role: 'user', content: userMessage }],
                stream: stream
            };

            // 调用API
            const response = await fetch(this.config.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.getKey()}`,
                    'HTTP-Referer': this.config.referer,
                    'X-Title': this.config.title
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(`API请求失败: ${response.status} ${errorData ? JSON.stringify(errorData) : ''}`);
            }

            if (stream) {
                return response; // 返回原始响应以便后续处理流
            } else {
                return await response.json();
            }
        } catch (error) {
            console.error('API调用失败:', error);
            throw error;
        }
    }

    /**
     * 调用AI聊天API（流式响应）
     * @param {string} userMessage 用户消息
     * @param {function} onChunk 处理每个响应片段的回调
     * @param {function} onComplete 处理完成的回调
     * @param {function} onError 处理错误的回调
     */
    async streamChatCompletion(userMessage, onChunk, onComplete, onError) {
        try {
            const response = await this.chatCompletion(userMessage, null, true);
            
            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            
            // 开始读取流
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // 解码数据
                buffer += decoder.decode(value, { stream: true });
                
                // 处理数据行
                const lines = buffer.split('\n');
                buffer = lines.pop(); // 最后一行可能不完整，留到下一次
                
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6);
                        if (jsonStr === '[DONE]') {
                            onComplete && onComplete();
                            continue;
                        }
                        
                        try {
                            const data = JSON.parse(jsonStr);
                            onChunk && onChunk(data);
                        } catch (e) {
                            console.warn('无法解析流式响应:', jsonStr);
                        }
                    }
                }
            }
            
            // 处理剩余数据
            if (buffer.trim() !== '') {
                if (buffer.startsWith('data: ')) {
                    const jsonStr = buffer.slice(6);
                    if (jsonStr !== '[DONE]') {
                        try {
                            const data = JSON.parse(jsonStr);
                            onChunk && onChunk(data);
                        } catch (e) {
                            console.warn('无法解析最后的流式响应:', jsonStr);
                        }
                    }
                }
            }
            
            onComplete && onComplete();
        } catch (error) {
            console.error('流式API调用失败:', error);
            onError && onError(error);
        }
    }

    /**
     * 聊天API的别名方法，用于与旧代码兼容
     * @param {string} userMessage 用户消息
     * @param {string} mode 聊天模式（普通、深度或思考）
     * @returns {Promise<Object>} API响应结果
     */
    async getChatCompletion(userMessage, mode) {
        // 根据模式选择适当的模型
        let model = this.getCurrentModelId();
        
        if (mode === 'deep') {
            model = this.config?.deepSearchModel || model;
        } else if (mode === 'think') {
            model = this.config?.thinkingModel || model;
        }
        
        // 调用基础方法
        return this.chatCompletion(userMessage, model, false);
    }
}

// 创建API服务实例
const apiService = new ApiService();

// 初始化ApiService（页面加载时）
document.addEventListener('DOMContentLoaded', () => {
    apiService.init().catch(error => {
        console.error('ApiService初始化失败:', error);
    });
}); 