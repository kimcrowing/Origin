// setupUsers.js - 用于生成加密的用户数据文件
// 注意：这个脚本不会部署到GitHub Pages，仅用于生成用户数据

const CryptoJS = require('crypto-js');
const fs = require('fs');

// 定义用户数据
const users = [
  {
    username: "admin",
    passwordHash: CryptoJS.SHA256("www").toString(),
    role: "admin",
    createdAt: new Date().toISOString()
  },
  {
    username: "user1",
    passwordHash: CryptoJS.SHA256("123").toString(),
    role: "user",
    createdAt: new Date().toISOString()
  }
];

// 使用密钥加密
const encryptionKey = "origin-app-secret-key";
const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(users), encryptionKey).toString();

// 确保目录存在
if (!fs.existsSync('./data')) {
  fs.mkdirSync('./data');
}

// 将加密数据写入文件
fs.writeFileSync('./data/users.enc', encryptedData);

console.log('用户数据加密完成，已保存到 data/users.enc');
console.log('用户列表:');
users.forEach(user => {
  console.log(`- ${user.username} (${user.role})`);
}); 