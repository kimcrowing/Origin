# 自动推送代码到GitHub的PowerShell脚本

# 获取当前日期时间作为提交信息
$dateTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMessage = "自动提交: $dateTime"

# 添加所有更改
git add .

# 检查是否有需要提交的更改
$status = git status --porcelain
if ($status) {
    # 提交更改
    git commit -m $commitMessage
    
    # 推送到GitHub
    git push origin master
    
    Write-Host "成功推送更改到GitHub！" -ForegroundColor Green
} else {
    Write-Host "没有需要提交的更改。" -ForegroundColor Yellow
} 