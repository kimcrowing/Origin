# 自动推送代码到GitHub的PowerShell脚本

# 设置代理
$env:HTTP_PROXY="socks5://127.0.0.1:7890"
$env:HTTPS_PROXY="socks5://127.0.0.1:7890"

# 配置Git全局代理
git config --global http.proxy socks5://127.0.0.1:7890
git config --global https.proxy socks5://127.0.0.1:7890

# 推送到GitHub
Write-Host "正在通过SOCKS5代理推送到GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "推送完成！" -ForegroundColor Green 