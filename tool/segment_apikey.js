const crypto = require('crypto-js');
const fs = require('fs');

// 多重加密密钥
const ENCRYPTION_KEYS = {
    segment1: 'Origin-Segment1-Key-2024',
    segment2: 'Origin-Segment2-Key-2024',
    segment3: 'Origin-Segment3-Key-2024'
};

// 分段长度配置
const SEGMENT_CONFIG = {
    segment1: { start: 0, length: 20 },  // 前20个字符
    segment2: { start: 20, length: 30 }, // 中间30个字符
    segment3: { start: 50 } // 剩余字符
};

/**
 * 分段加密API密钥
 * @param {string} apiKey - 原始API密钥
 * @returns {Object} - 加密后的分段数据
 */
function encryptSegments(apiKey) {
    try {
        // 验证API密钥格式
        if (!apiKey.startsWith('sk-or-v1-')) {
            throw new Error('无效的API密钥格式');
        }

        // 分段加密
        const segments = {
            segment1: apiKey.substr(SEGMENT_CONFIG.segment1.start, SEGMENT_CONFIG.segment1.length),
            segment2: apiKey.substr(SEGMENT_CONFIG.segment2.start, SEGMENT_CONFIG.segment2.length),
            segment3: apiKey.substr(SEGMENT_CONFIG.segment3.start)
        };

        // 对每个分段进行加密
        const encryptedSegments = {};
        for (const [key, value] of Object.entries(segments)) {
            encryptedSegments[key] = crypto.AES.encrypt(value, ENCRYPTION_KEYS[key]).toString();
        }

        return encryptedSegments;
    } catch (error) {
        console.error('加密过程出错:', error.message);
        throw error;
    }
}

/**
 * 解密并组合API密钥
 * @param {Object} encryptedSegments - 加密的分段数据
 * @returns {string} - 解密后的完整API密钥
 */
function decryptAndCombine(encryptedSegments) {
    try {
        const decryptedSegments = {};
        
        // 解密每个分段
        for (const [key, value] of Object.entries(encryptedSegments)) {
            const decrypted = crypto.AES.decrypt(value, ENCRYPTION_KEYS[key]);
            decryptedSegments[key] = decrypted.toString(crypto.enc.Utf8);
        }

        // 验证并组合
        const combinedKey = decryptedSegments.segment1 + 
                          decryptedSegments.segment2 + 
                          decryptedSegments.segment3;

        if (!combinedKey.startsWith('sk-or-v1-')) {
            throw new Error('解密后的API密钥格式无效');
        }

        return combinedKey;
    } catch (error) {
        console.error('解密过程出错:', error.message);
        throw error;
    }
}

/**
 * 更新配置文件
 * @param {Object} encryptedSegments - 加密的分段数据
 */
function updateConfig(encryptedSegments) {
    try {
        // 读取现有配置
        const configData = fs.readFileSync('config.json', 'utf8');
        const config = JSON.parse(configData);

        // 更新配置
        config.api = {
            ...config.api,
            key_segments: encryptedSegments
        };

        // 写入配置文件
        fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
        console.log('配置文件已更新');
    } catch (error) {
        console.error('更新配置文件失败:', error.message);
        throw error;
    }
}

/**
 * 验证API密钥
 * @param {string} apiKey - 待验证的API密钥
 */
function verifyApiKey(apiKey) {
    try {
        // 加密分段
        console.log('开始分段加密...');
        const encryptedSegments = encryptSegments(apiKey);
        console.log('分段加密完成');

        // 解密测试
        console.log('\n验证解密...');
        const decryptedKey = decryptAndCombine(encryptedSegments);
        console.log('解密验证:', apiKey === decryptedKey ? '成功' : '失败');

        // 如果验证成功，更新配置
        if (apiKey === decryptedKey) {
            console.log('\n更新配置文件...');
            updateConfig(encryptedSegments);
            console.log('处理完成！');
        }
    } catch (error) {
        console.error('\n处理失败:', error.message);
    }
}

// 测试用例
const testApiKey = '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';
verifyApiKey(testApiKey);

// 导出函数供其他模块使用
module.exports = {
    encryptSegments,
    decryptAndCombine,
    updateConfig,
    verifyApiKey
}; 