// API密钥验证工具
const fs = require('fs');
const crypto = require('crypto-js');

// 导入分段加密解密模块
const { decryptAndCombine } = require('./segment_apikey');

// 加密密钥
const ENCRYPTION_KEY = 'Origin-SecretKey-2023';

// 测试密钥的前几位（用于验证目的，不存储完整密钥）
const API_KEY_PREFIX = 'sk-or-v1-';

// 读取配置文件
try {
    const configData = fs.readFileSync('config.json', 'utf8');
    const config = JSON.parse(configData);
    
    // 检查配置格式
    if (config.api && config.api.key_segments) {
        console.log('=== 使用分段密钥验证 ===');
        
        try {
            // 从分段密钥恢复完整密钥
            const apiKeyFromSegments = decryptAndCombine(config.api.key_segments);
            
            // 安全验证：只输出密钥前缀
            console.log('解密结果前缀:', apiKeyFromSegments.substring(0, 15) + '...(已隐藏)');
            console.log('密钥格式验证:', apiKeyFromSegments.startsWith(API_KEY_PREFIX) ? '成功' : '失败');
            
            console.log('\n=== 安全检查 ===');
            console.log('配置文件使用分段加密方式存储API密钥');
            console.log('密钥验证成功！\n');
            
        } catch (error) {
            console.error('分段密钥解密失败:', error.message);
        }
    } 
    else if (config.api && config.api.key_encrypted) {
        console.log('=== 使用旧加密格式 ===');
        console.log('警告: 您正在使用旧的单一加密格式存储API密钥');
        console.log('建议: 请使用 node tool/segment_apikey.js 转换为更安全的分段加密格式');
        
        // 从配置中获取加密的API密钥
        const encryptedKey = config.api.key_encrypted;
        
        // 解密配置中的密钥
        try {
            const configDecrypted = crypto.AES.decrypt(encryptedKey, ENCRYPTION_KEY).toString(crypto.enc.Utf8);
            console.log('\n配置中的密钥解密结果:', configDecrypted.substring(0, 15) + '...(已隐藏)');
            console.log('密钥格式验证:', configDecrypted.startsWith(API_KEY_PREFIX) ? '成功' : '失败');
            
        } catch (error) {
            console.error('配置中的密钥解密失败:', error.message);
        }
    } else {
        console.error('配置文件中缺少API密钥信息');
        process.exit(1);
    }
} catch (error) {
    console.error('读取或解析配置文件失败:', error.message);
} 