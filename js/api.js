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
                model: model || this.config.defaultModel,
                messages: [{ role: 'user', content: userMessage }],
                stream: stream
            };

            // 如果是think模式，添加思考过程指令
            if (model === this.config?.thinkingModel) {
                requestBody.thinking = true; // 告诉模型我们想要思考过程
                
                // 添加思考过程提示词
                requestBody.messages.unshift({
                    role: 'system',
                    content: '当回答复杂问题时，请先展示详细的思考过程，然后再给出最终回答。思考过程将作为辅助信息显示给用户。'
                });
            }

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
     * @param {string} model 使用的模型
     */
    async streamChatCompletion(userMessage, onChunk, onComplete, onError, model = null) {
        try {
            const response = await this.chatCompletion(userMessage, model, true);
            
            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            
            // 创建累积跟踪器
            let totalContentReceived = '';
            let totalChunksReceived = 0;
            let lastLogTime = Date.now();
            const logInterval = 5000; // 每5秒记录一次进度
            
            // 重试计数器
            let retries = 0;
            const maxRetries = 5; // 增加最大重试次数
            
            // 跟踪处理的token数量（用于大型响应处理）
            let processedTokens = 0;
            const chunkSize = 1000; // 每1000个token一个处理单元
            
            // 在控制台显示请求开始
            console.log('%c开始接收流式响应 (模型: ' + (model || this.config.defaultModel) + ')', 'background:#4CAF50; color:white; padding:3px 6px; border-radius:3px;');
            
            // 响应超时检测
            let lastResponseTime = Date.now();
            const responseTimeout = 30000; // 30秒超时检测
            const timeoutCheckInterval = setInterval(() => {
                const currentTime = Date.now();
                if (currentTime - lastResponseTime > responseTimeout) {
                    clearInterval(timeoutCheckInterval);
                    reader.cancel(); // 取消流读取
                    console.warn(`流响应超时 (已接收 ${totalChunksReceived} 个数据块, ${totalContentReceived.length} 个字符)`);
                    onError && onError(new Error('响应超时，可能是网络问题或服务器繁忙'));
                }
                
                // 定期记录进度
                if (currentTime - lastLogTime > logInterval) {
                    console.log(`%c接收进度: ${totalChunksReceived} 个数据块, ${totalContentReceived.length} 个字符`, 'color:#4CAF50');
                    lastLogTime = currentTime;
                }
            }, 5000); // 每5秒检查一次
            
            // 开始读取流
            while (true) {
                let value, done;
                
                try {
                    // 尝试读取流
                    const readResult = await reader.read();
                    value = readResult.value;
                    done = readResult.done;
                    
                    // 更新最后响应时间
                    lastResponseTime = Date.now();
                    
                    // 重置重试计数
                    retries = 0;
                } catch (error) {
                    // 如果读取失败，尝试重试
                    retries++;
                    console.warn(`流读取失败（第${retries}次尝试）:`, error);
                    
                    if (retries > maxRetries) {
                        clearInterval(timeoutCheckInterval);
                        throw new Error(`流读取失败，已达最大重试次数(${maxRetries}): ${error.message}`);
                    }
                    
                    // 延时后重试
                    await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                    continue;
                }
                
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
                            clearInterval(timeoutCheckInterval);
                            
                            // 记录完成状态
                            console.log(`%c流式响应完成! 共接收 ${totalChunksReceived} 个数据块, ${totalContentReceived.length} 个字符`, 'background:#4CAF50; color:white; padding:3px 6px; border-radius:3px;');
                            
                            onComplete && onComplete();
                            continue;
                        }
                        
                        try {
                            const data = JSON.parse(jsonStr);
                            totalChunksReceived++;
                            
                            // 处理思考过程
                            if (data.choices && data.choices[0]) {
                                const choice = data.choices[0];
                                
                                // 检查是否包含思考过程
                                if (choice.thinking || 
                                    (choice.delta && choice.delta.thinking)) {
                                    
                                    // 构造思考过程的delta对象
                                    const thinkingData = {...data};
                                    if (choice.thinking) {
                                        // 如果直接包含思考过程
                                        thinkingData.choices[0].delta = {
                                            thinking: choice.thinking
                                        };
                                    }
                                    
                                    // 传递思考过程
                                    onChunk && onChunk(thinkingData);
                                }
                                
                                // 累积内容
                                if (choice.delta && choice.delta.content) {
                                    totalContentReceived += choice.delta.content;
                                }
                                
                                // 跟踪处理的token数量
                                processedTokens++;
                                
                                // 每处理一定数量的token，执行一次垃圾回收（防止内存泄漏）
                                if (processedTokens % chunkSize === 0) {
                                    // 这里只是标记，实际的垃圾回收由浏览器决定
                                    if (typeof window.gc === 'function') {
                                        try {
                                            window.gc();
                                        } catch (e) {
                                            // 忽略错误
                                        }
                                    }
                                    
                                    // 防止UI阻塞，让渲染线程有机会更新
                                    await new Promise(resolve => setTimeout(resolve, 0));
                                }
                            }
                            
                            // 传递常规内容
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
                            totalChunksReceived++;
                            
                            // 累积最后的内容
                            if (data.choices && data.choices[0] && 
                                data.choices[0].delta && data.choices[0].delta.content) {
                                totalContentReceived += data.choices[0].delta.content;
                            }
                            
                            onChunk && onChunk(data);
                        } catch (e) {
                            console.warn('无法解析最后的流式响应:', jsonStr);
                        }
                    }
                }
            }
            
            clearInterval(timeoutCheckInterval);
            
            // 记录最终完成的字符总数
            console.log(`%c最终接收统计: ${totalContentReceived.length} 个字符, ${totalContentReceived.split('\n').length} 行`, 'color:#4CAF50; font-weight:bold;');
            
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
     * @param {string} customModel 自定义模型，覆盖配置中的模型
     * @returns {Promise<Object>} API响应结果
     */
    async getChatCompletion(userMessage, mode, customModel = null) {
        // 如果提供了自定义模型，则使用它
        if (customModel) {
            return this.chatCompletion(userMessage, customModel, false);
        }
        
        // 否则根据模式选择适当的模型
        let model = this.config?.defaultModel;
        
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