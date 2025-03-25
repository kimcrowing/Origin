# Grok克隆

这是一个精确模仿Grok.com界面的静态网站项目，使用纯HTML、CSS和JavaScript开发，可以部署在GitHub Pages上。

## 项目特点

- 精确还原Grok官方界面风格和布局
- 纯静态实现，无需服务器
- 响应式设计，适配移动设备
- 轻量级代码，加载速度快
- 支持Think和DeepSearch两种模式
- 为后期接入后端API预留接口

## 界面特点

- 纯黑色背景的极简主义设计
- 顶部导航栏，包含logo和操作按钮
- 中间聊天区域
- 底部输入框，包含多种操作选项
- Think和DeepSearch功能模拟

## 本地开发

克隆仓库后，可以直接在浏览器中打开`index.html`文件进行预览。

或者使用任意本地服务器：

```bash
# 使用Python启动简单的HTTP服务器
python -m http.server

# 或者使用Node.js的http-server (需要先安装: npm install -g http-server)
http-server
```

## 部署到GitHub Pages

1. Fork本仓库
2. 进入仓库的Settings > Pages
3. 在Source部分选择"GitHub Actions"
4. 自动触发workflow，部署完成后可通过`https://{username}.github.io/{repository-name}`访问

## 后期开发计划

- 接入实际的AI对话API
- 添加用户认证功能
- 支持图片生成和展示
- 增加历史对话管理功能
- 优化移动端体验

## 目录结构

```
.
├── css/                # 样式文件
│   └── styles.css
├── js/                 # JavaScript脚本
│   └── script.js       # 交互逻辑
├── images/             # 图片资源（如有）
├── .github/            # GitHub Actions配置
├── index.html          # 主页
└── README.md           # 项目说明
```

## 贡献指南

欢迎提交Pull Request或Issue来改进项目。

## 许可证

MIT 

# Origin AI - 静态用户认证与API密钥加密系统

## 项目简介

Origin AI 是一个静态部署的AI对话系统，使用纯前端方式实现用户认证和API密钥加密存储，无需后端服务器。通过将加密后的用户凭据和API密钥存储在GitHub Pages可访问的静态JSON文件中，实现安全的用户管理和API调用。

## 技术实现

### 无后端认证系统

该项目使用纯前端技术实现了用户认证系统：

1. **用户凭据加密存储**：
   - 邮箱地址使用MD5哈希存储
   - 密码使用加盐MD5哈希存储
   - 用户名使用AES加密存储

2. **认证流程**：
   - 前端对输入的邮箱和密码计算哈希值
   - 与`users.json`中存储的哈希值比对
   - 匹配成功后生成用户令牌并存储在localStorage中

3. **令牌管理**：
   - 使用AES加密生成用户令牌
   - 令牌包含用户信息和时间戳
   - 检查令牌时验证是否过期

### API密钥加密存储

API密钥加密存储的实现方式：

1. **API配置加密**：
   - API密钥使用AES加密存储在`config.json`中
   - 加密密钥存储在前端代码中（注意：这提供有限安全性）
   - 实时解密API密钥以发送请求，不在localStorage中存储明文

2. **安全性措施**：
   - API密钥仅在运行时内存中解密
   - 使用闭包封装解密的API密钥，避免直接暴露
   - 所有API请求通过HTTPS发送

3. **管理员工具**：
   - 提供`tool/apikey_encrypt.html`工具用于管理员加密API密钥
   - 生成加密后的配置文件以便安全部署

### 安全性考虑

1. 所有敏感信息均经过加密或哈希处理后存储
2. 用户密码从不以明文方式传输或存储
3. API密钥不会在前端暴露给普通用户
4. 令牌具有时效性，过期后需要重新登录
5. 请注意，此方法适用于中低安全需求的个人项目或演示，不适合管理高度敏感数据

## 用户管理流程

由于GitHub Pages是静态托管，无法实时更新用户数据。添加新用户的流程如下：

1. 用户在注册表单中填写信息
2. 前端计算相应的哈希值和加密值
3. 系统提示用户注册成功，但需要管理员手动添加账户
4. 管理员将新用户信息添加到`users.json`并推送到GitHub仓库

## API密钥管理流程

更新或修改API密钥的流程：

1. 管理员访问`tool/apikey_encrypt.html`页面
2. 输入API密钥和相关配置信息
3. 生成加密后的JSON配置
4. 将生成的JSON内容更新到`config.json`文件
5. 提交更改到GitHub仓库

## 测试账号

默认提供一个测试账号：
- 邮箱：admin@example.com
- 密码：password123

## 自定义说明

1. 加密密钥和盐值定义在`js/crypto.js`文件中
2. 用户数据结构定义在`users.json`文件中
3. API配置结构定义在`config.json`文件中
4. 认证相关功能位于`js/crypto.js`和`js/auth.js`文件中
5. API请求封装位于`js/api.js`文件中

## 使用OpenRouter API

项目默认配置使用OpenRouter API：

1. **配置参数**：
   - 默认模型: `deepseek/deepseek-r1:free`
   - API地址: `https://openrouter.ai/api/v1/chat/completions`

2. **请求格式**：
   - 支持标准的OpenAI格式请求
   - 支持流式和非流式响应

3. **自定义配置**：
   - 如需更改模型或其他设置，修改`config.json`文件
   - 使用加密工具重新生成配置

## 注意事项

- 此认证系统和API密钥加密存储的安全性依赖于加密密钥的保密性
- GitHub Pages环境中的所有代码和数据对公众可见
- 加密密钥在前端代码中可以被逆向工程获取
- 适合个人项目和演示使用，不推荐用于商业应用或处理敏感信息

## 自动代码推送

本仓库配置了两种自动推送代码的方式：

1. **GitHub Actions 自动推送**
   - 配置文件: `.github/workflows/auto-push.yml`
   - 每6小时自动检查并提交更改
   - 可以在GitHub Actions页面手动触发

2. **本地脚本推送**
   - 脚本文件: `push-to-github.ps1`
   - 在PowerShell中运行脚本即可推送更改:
     ```powershell
     .\push-to-github.ps1
     ``` 