/**
 * Origin 加密工具
 * 提供用户认证相关的加密功能
 */

// 加密密钥（实际应用中应使用环境变量或其他安全方式存储）
const ENCRYPTION_KEY = 'Origin-SecretKey-2023';

/**
 * 计算MD5哈希值
 * @param {string} str 需要计算哈希的字符串
 * @returns {string} 哈希值
 */
function md5(str) {
    // 这里使用一个简单实现，实际应用中建议使用标准库
    return CryptoJS.MD5(str).toString();
}

/**
 * 使用AES加密字符串
 * @param {string} str 需要加密的字符串
 * @param {string} key 加密密钥
 * @returns {string} 加密后的字符串
 */
function encryptAES(str, key = ENCRYPTION_KEY) {
    return CryptoJS.AES.encrypt(str, key).toString();
}

/**
 * 使用AES解密字符串
 * @param {string} encrypted 加密后的字符串
 * @param {string} key 解密密钥
 * @returns {string} 解密后的字符串
 */
function decryptAES(encrypted, key = ENCRYPTION_KEY) {
    return CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
}

/**
 * 生成用户身份验证令牌
 * @param {Object} user 用户对象
 * @returns {string} 加密后的用户令牌
 */
function generateUserToken(user) {
    try {
        // 使用AES加密用户数据
        const tokenData = {
            id: user.id,
            name: user.name,
            email: user.email,
            initials: user.initials,
            avatar: user.avatar,
            role: user.role || 'user', // 添加角色信息，默认为普通用户
            timestamp: Date.now()
        };
        
        const token = CryptoJS.AES.encrypt(
            JSON.stringify(tokenData),
            'Origin-Token-Key-2023'
        ).toString();
        
        return token;
    } catch (error) {
        console.error('生成用户令牌出错:', error);
        throw error;
    }
}

/**
 * 验证用户令牌
 * @param {string} token 用户令牌
 * @returns {Object|null} 解密后的用户信息，无效则返回null
 */
function validateUserToken(token) {
    try {
        const decrypted = CryptoJS.AES.decrypt(
            token,
            'Origin-Token-Key-2023'
        ).toString(CryptoJS.enc.Utf8);
        
        if (!decrypted) {
            return null;
        }
        
        const userData = JSON.parse(decrypted);
        
        // 检查令牌是否过期（改为4小时）
        const tokenAge = Date.now() - userData.timestamp;
        const maxAge = 4 * 60 * 60 * 1000; // 4小时
        
        if (tokenAge > maxAge) {
            return null; // 令牌已过期
        }
        
        // 确保返回的用户数据包含角色信息
        if (!userData.role) {
            userData.role = 'user'; // 默认为普通用户
        }
        
        return userData;
    } catch (error) {
        console.error('验证用户令牌出错:', error);
        return null;
    }
}

/**
 * 计算邮箱哈希值
 * @param {string} email 用户邮箱
 * @returns {string} 邮箱哈希值
 */
function hashEmail(email) {
    return md5(email.trim().toLowerCase());
}

/**
 * 计算密码哈希值
 * @param {string} password 用户密码
 * @param {string} salt 盐值
 * @returns {string} 密码哈希值
 */
function hashPassword(password, salt = 'OriginSalt2023') {
    return md5(password + salt);
}

/**
 * 加密用户名
 * @param {string} name 用户名
 * @returns {string} 加密后的用户名
 */
function encryptUserName(name) {
    return encryptAES(name);
}

/**
 * 解密用户名
 * @param {string} encrypted 加密后的用户名
 * @returns {string} 解密后的用户名
 */
function decryptUserName(encrypted) {
    return decryptAES(encrypted);
}

/**
 * 加载用户数据
 * @returns {Promise<Object>} 用户数据对象
 */
async function loadUserData() {
    try {
        // 使用相对路径
        const response = await fetch('users.json');
        if (!response.ok) {
            throw new Error('无法加载用户数据');
        }
        return await response.json();
    } catch (error) {
        console.error('加载用户数据失败:', error);
        return { users: [] };
    }
}

/**
 * 通过邮箱和密码验证用户
 * @param {string} email 用户邮箱
 * @param {string} password 用户密码
 * @returns {Promise<Object>} 验证结果 {success, message, user}
 */
async function authenticateUser(email, password) {
    try {
        // 获取用户数据
        const usersData = await loadUserData();
        
        if (!usersData || !usersData.users) {
            return { success: false, message: '无法获取用户数据' };
        }
        
        // 计算邮箱和密码的哈希值
        const emailHash = hashEmail(email);
        const passwordHash = hashPassword(password);
        
        // 查找匹配的用户
        const user = usersData.users.find(u => 
            u.email_hash === emailHash && 
            u.password_hash === passwordHash
        );
        
        if (!user) {
            return { success: false, message: '邮箱或密码不正确' };
        }
        
        // 解密用户名
        const decryptedName = decryptAES(user.name_encrypted);
        
        // 返回用户信息（不包含密码哈希）
        return {
            success: true,
            user: {
                id: user.id,
                name: decryptedName,
                email: email,
                initials: user.initials,
                avatar: user.avatar,
                role: user.role || 'user' // 添加角色信息，默认为普通用户
            }
        };
    } catch (error) {
        console.error('认证过程中出错:', error);
        return { success: false, message: '认证过程中出现错误' };
    }
}

/**
 * 注册新用户（模拟注册，实际上在GitHub Pages中不能真正保存）
 * @param {string} name 用户名
 * @param {string} email 邮箱
 * @param {string} password 密码
 * @returns {Promise<Object>} 注册结果 {success, message, user}
 */
async function registerUser(name, email, password) {
    try {
        const emailHash = hashEmail(email);
        const passwordHash = hashPassword(password);
        const nameEncrypted = encryptUserName(name);
        
        // 加载现有用户数据
        const userData = await loadUserData();
        
        // 检查邮箱是否已存在
        const existingUser = userData.users.find(u => u.email_hash === emailHash);
        if (existingUser) {
            return {
                success: false,
                message: '该邮箱已被注册'
            };
        }
        
        // 生成用户ID和首字母缩写
        const userId = `user_${Date.now()}`;
        const initials = name.split(/\s+/).map(n => n.charAt(0).toUpperCase()).join('').substring(0, 2);
        
        // 创建新用户（注意：这里只是返回，实际不能保存到GitHub Pages）
        const newUser = {
            id: userId,
            name: name,
            email: email,
            initials: initials,
            avatar: null
        };
        
        // 在实际场景中，管理员会手动更新users.json并推送到GitHub
        
        return {
            success: true,
            message: '注册成功！由于这是静态网站，您的注册信息无法实时保存。请联系管理员添加您的账户。',
            user: newUser
        };
    } catch (error) {
        console.error('用户注册失败:', error);
        return {
            success: false,
            message: '注册过程出错，请稍后再试'
        };
    }
}

/**
 * 加密API密钥
 * @param {string} apiKey API密钥
 * @returns {string} 加密后的API密钥
 */
function encryptApiKey(apiKey) {
    return encryptAES(apiKey);
}

/**
 * 解密API密钥
 * @param {string} encryptedKey 加密后的API密钥
 * @returns {string} 解密后的API密钥
 */
function decryptApiKey(encryptedKey) {
    return decryptAES(encryptedKey);
}

/**
 * 加载API配置
 * @returns {Promise<Object>} API配置对象
 */
async function loadApiConfig() {
    try {
        // 使用相对路径
        const response = await fetch('config.json');
        if (!response.ok) {
            throw new Error('无法加载API配置');
        }
        const config = await response.json();
        
        // 解密API密钥
        if (config.api && config.api.key_encrypted) {
            try {
                const decryptedKey = decryptApiKey(config.api.key_encrypted);
                // 不直接返回解密的密钥，而是在闭包中使用它
                return {
                    ...config.api,
                    getKey: () => decryptedKey,
                    url: config.api.url,
                    defaultModel: config.api.default_model,
                    referer: config.api.referer,
                    title: config.api.title
                };
            } catch (error) {
                console.error('API密钥解密失败:', error);
                throw new Error('API密钥解密失败');
            }
        } else {
            throw new Error('API配置不完整');
        }
    } catch (error) {
        console.error('加载API配置失败:', error);
        throw error;
    }
}

/**
 * 工具函数：生成加密密钥文件内容（仅供管理员使用）
 * @param {string} apiKey 要加密的API密钥
 * @returns {string} 加密后的配置JSON字符串
 */
function generateEncryptedConfigFile(apiKey) {
    const encryptedKey = encryptApiKey(apiKey);
    const config = {
        api: {
            key_encrypted: encryptedKey,
            url: "https://openrouter.ai/api/v1/chat/completions",
            default_model: "deepseek/deepseek-r1:free",
            referer: "http://localhost",
            title: "AI Chat Test"
        }
    };
    return JSON.stringify(config, null, 2);
}

/**
 * 加密提示词数据
 * @param {Object} promptsData 提示词数据对象
 * @returns {string} 加密后的提示词数据
 */
function encryptPrompts(promptsData) {
    try {
        const json = JSON.stringify(promptsData);
        return encryptAES(json, ENCRYPTION_KEY);
    } catch (error) {
        console.error('加密提示词数据出错:', error);
        throw error;
    }
}

/**
 * 解密提示词数据
 * @param {string} encryptedData 加密后的提示词数据
 * @returns {Object} 解密后的提示词数据对象
 */
function decryptPrompts(encryptedData) {
    try {
        const decrypted = decryptAES(encryptedData, ENCRYPTION_KEY);
        return JSON.parse(decrypted);
    } catch (error) {
        console.error('解密提示词数据出错:', error);
        return null;
    }
}

/**
 * 加载提示词配置
 * @returns {Promise<Object>} 提示词配置对象
 */
async function loadPromptsConfig() {
    try {
        // 使用相对路径
        const response = await fetch('data/prompts.json');
        if (!response.ok) {
            throw new Error('无法加载提示词配置');
        }
        return await response.json();
    } catch (error) {
        console.error('加载提示词配置失败:', error);
        return null;
    }
} 