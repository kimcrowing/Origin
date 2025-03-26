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
        console.log('初始化API服务...');
        
        try {
            // 加载配置文件
            const response = await fetch('/config.json');
            
            if (!response.ok) {
                throw new Error(`无法加载配置文件: ${response.status} ${response.statusText}`);
            }
            
            // 解析配置数据
            const configData = await response.json();
            console.log('已加载配置:', configData);
            
            // 设置API配置
            this.config = configData.api;
            this.isConfigLoaded = true;
            
            // 尝试从已解密的密钥或keyService获取API密钥
            this.config.apiKey = await this.getApiKey();
            
            console.log('API服务初始化完成');
        } catch (error) {
            console.error('API服务初始化失败:', error);
            this.isConfigLoaded = false;
        }
    }

    /**
     * 构建API请求数据
     * @param {string} message 用户消息
     * @param {string} mode 模式（chat、deep、think）
     * @returns {Object} 请求数据对象
     */
    buildRequestData(message, mode = 'chat') {
        // 根据模式选择适当的模型
        let model = this.config?.defaultModel;
        
        if (mode === 'deep') {
            model = this.config?.deepSearchModel || model;
        } else if (mode === 'think') {
            model = this.config?.thinkingModel || model;
        }
        
        // 构建消息数组
        const messages = [
            {
                role: "user",
                content: message
            }
        ];
        
        // 返回请求数据
        return {
            model: model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000
        };
    }

    /**
     * 执行聊天补全API调用
     * @param {Object} requestData 请求数据
     * @returns {Promise<Object>} API响应结果
     */
    async chatCompletion(requestData) {
        console.log('API请求数据:', requestData);
        
        try {
            // 发送API请求
            const response = await fetch(`${this.config.apiBaseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify(requestData)
            });
            
            // 检查响应状态
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API响应错误:', response.status, errorText);
                throw new Error(`API响应错误: ${response.status} ${errorText}`);
            }
            
            // 解析JSON响应
            const data = await response.json();
            console.log('API响应数据:', data);
            
            return data;
        } catch (error) {
            console.error('API调用出错:', error);
            throw error;
        }
    }

    /**
     * 执行流式聊天补全
     * @param {Object} requestData 请求数据
     * @param {Function} onChunk 处理数据块的回调
     * @param {Function} onComplete 完成时的回调
     * @param {Function} onError 错误处理回调
     */
    async streamCompletion(requestData, onChunk, onComplete, onError) {
        try {
            // 发送API请求
            const response = await fetch(`${this.config.apiBaseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify(requestData)
            });
            
            // 检查响应状态
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API流式响应错误:', response.status, errorText);
                throw new Error(`API响应错误: ${response.status} ${errorText}`);
            }
            
            // 获取响应的可读流
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            // 读取数据流
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }
                
                // 解码数据并添加到缓冲区
                buffer += decoder.decode(value, { stream: true });
                
                // 处理缓冲区中的所有完整数据行
                const lines = buffer.split('\n');
                buffer = lines.pop();  // 保留最后一个不完整的行
                
                // 处理每一行数据
                for (const line of lines) {
                    // 跳过空行
                    if (!line.trim()) continue;
                    
                    // 跳过以冒号开头的特殊行（如:keepalive）
                    if (line.startsWith(':')) continue;
                    
                    // 移除data:前缀并解析JSON
                    const jsonData = line.replace(/^data: /, '').trim();
                    
                    // 处理数据流结束标记
                    if (jsonData === '[DONE]') {
                        continue;
                    }
                    
                    try {
                        // 解析JSON数据
                        const parsedData = JSON.parse(jsonData);
                        
                        // 调用回调处理数据块
                        if (onChunk) {
                            onChunk(parsedData);
                        }
                    } catch (e) {
                        console.error('解析流数据出错:', e, jsonData);
                    }
                }
            }
            
            // 处理最后的数据片段
            if (buffer.trim()) {
                try {
                    const jsonData = buffer.replace(/^data: /, '').trim();
                    if (jsonData !== '[DONE]') {
                        const parsedData = JSON.parse(jsonData);
                        if (onChunk) {
                            onChunk(parsedData);
                        }
                    }
                } catch (e) {
                    console.error('解析最后的流数据出错:', e, buffer);
                }
            }
            
            // 调用完成回调
            if (onComplete) {
                onComplete();
            }
        } catch (error) {
            // 调用错误回调
            if (onError) {
                onError(error);
            } else {
                console.error('流式补全出错:', error);
                throw error;
            }
        }
    }

    /**
     * 聊天API的别名方法，用于与旧代码兼容
     * @param {string} userMessage 用户消息
     * @param {string} mode 聊天模式（普通、深度或思考）
     * @returns {Promise<Object>} API响应结果
     */
    async getChatCompletion(userMessage, mode = 'chat', model = null) {
        // 构建API请求数据
        const requestData = this.buildRequestData(userMessage, mode);
        
        // 如果提供了特定模型，使用提供的模型
        if (model) {
            requestData.model = model;
        }
        
        // 调用API获取响应
        return await this.chatCompletion(requestData);
    }

    // 流式聊天补全
    async streamChatCompletion(message, onChunk, onComplete, onError, model = null) {
        // 构建API请求数据
        const requestData = this.buildRequestData(message, 'chat');
        
        // 开启流式响应
        requestData.stream = true;
        
        // 如果提供了特定模型，使用提供的模型
        if (model) {
            requestData.model = model;
        }
        
        // 调用流式API
        try {
            await this.streamCompletion(requestData, onChunk, onComplete, onError);
        } catch (error) {
            if (onError) {
                onError(error);
            } else {
                console.error('流式补全出错:', error);
            }
        }
    }

    /**
     * 获取API密钥
     * @returns {Promise<string>} API密钥
     */
    async getApiKey() {
        // 检查配置是否已加载
        if (!this.config) {
            throw new Error('配置未加载，无法获取API密钥');
        }
        
        try {
            // 如果存在加密的密钥，则使用它
            if (this.config.key_encrypted) {
                return CryptoJS.AES.decrypt(
                    this.config.key_encrypted,
                    authService.getAuthToken() || 'default-key'
                ).toString(CryptoJS.enc.Utf8);
            }
            
            // 如果存在密钥段，则组合它们
            if (this.config.key_segments) {
                const segments = Object.values(this.config.key_segments);
                let combinedKey = '';
                
                for (const segment of segments) {
                    const decryptedSegment = CryptoJS.AES.decrypt(
                        segment,
                        authService.getAuthToken() || 'default-key'
                    ).toString(CryptoJS.enc.Utf8);
                    
                    combinedKey += decryptedSegment;
                }
                
                return combinedKey;
            }
            
            throw new Error('配置中没有找到API密钥');
        } catch (error) {
            console.error('获取API密钥失败:', error);
            throw error;
        }
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