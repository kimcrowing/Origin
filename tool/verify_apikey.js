// API密钥验证工具
const fs = require('fs');
const crypto = require('crypto-js');

// 加密密钥
const ENCRYPTION_KEY = 'Origin-SecretKey-2023';

// 要验证的API密钥
const apiKeyToVerify = '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';

// 读取配置文件
try {
    const configData = fs.readFileSync('config.json', 'utf8');
    const config = JSON.parse(configData);
    
    if (!config.api || !config.api.key_encrypted) {
        console.error('配置文件中缺少加密的API密钥');
        process.exit(1);
    }
    
    // 从配置中获取加密的API密钥
    const encryptedKey = config.api.key_encrypted;
    
    // 测试加密和解密
    console.log('=== API密钥验证 ===');
    
    // 加密测试
    const encryptedTest = crypto.AES.encrypt(apiKeyToVerify, ENCRYPTION_KEY).toString();
    console.log('待验证密钥加密结果: (输出过长已省略)');
    
    // 解密测试
    const decryptedTest = crypto.AES.decrypt(encryptedTest, ENCRYPTION_KEY).toString(crypto.enc.Utf8);
    console.log('解密结果:', decryptedTest.substring(0, 20) + '...(已省略)');
    console.log('加解密验证:', apiKeyToVerify === decryptedTest ? '成功' : '失败');
    
    // 解密配置中的密钥
    try {
        const configDecrypted = crypto.AES.decrypt(encryptedKey, ENCRYPTION_KEY).toString(crypto.enc.Utf8);
        console.log('\n=== 配置文件检查 ===');
        console.log('配置中的密钥解密结果:', configDecrypted.substring(0, 20) + '...(已省略)');
        console.log('配置密钥与待验证密钥是否匹配:', configDecrypted === apiKeyToVerify ? '是' : '否');
        
        if (configDecrypted !== apiKeyToVerify) {
            console.log('\n=== 更新建议 ===');
            console.log('当前配置中的密钥与待验证密钥不匹配，建议更新配置文件。');
            
            const newConfig = {
                api: {
                    key_encrypted: encryptedTest,
                    url: config.api.url || "https://openrouter.ai/api/v1/chat/completions",
                    default_model: config.api.default_model || "deepseek/deepseek-r1:free",
                    referer: config.api.referer || "http://localhost",
                    title: config.api.title || "AI Chat Test"
                }
            };
            
            // 不输出完整JSON
            console.log('已生成更新配置，可使用工具中的apikey_encrypt.html生成新配置');
        } else {
            console.log('\n配置验证成功！API密钥已正确设置。');
        }
    } catch (error) {
        console.error('配置中的密钥解密失败:', error.message);
    }
} catch (error) {
    console.error('读取或解析配置文件失败:', error.message);
} 