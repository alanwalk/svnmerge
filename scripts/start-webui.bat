@echo off
REM SVN Merge Tool - Web UI 启动脚本 (Windows)

echo =========================================
echo   SVN Merge Tool - Web UI
echo =========================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 错误: 未找到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查是否已构建
if not exist "dist" (
    echo 📦 首次运行，正在构建项目...
    call npm install
    call npm run build
    echo.
)

REM 启动 daemon
echo 🚀 启动 SVN Merge Tool Daemon...
node dist\daemon-cli.js start

REM 等待服务启动
timeout /t 2 /nobreak >nul

REM 检查服务状态
node dist\daemon-cli.js status >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 服务已启动！
    echo.
    echo 📍 访问地址:
    echo    Web UI:    http://localhost:36695/index.html
    echo    测试页面:  http://localhost:36695/test.html
    echo    API:       http://localhost:36695/api/health
    echo    WebSocket: ws://localhost:36695/ws
    echo.
    echo 💡 提示:
    echo    - 使用 Ctrl+C 停止服务
    echo    - 或运行: node dist\daemon-cli.js stop
    echo.

    REM 打开浏览器
    echo 🌐 正在打开浏览器...
    start http://localhost:36695/index.html
) else (
    echo.
    echo ❌ 服务启动失败
    echo 请检查日志: logs\daemon.log
    pause
    exit /b 1
)

pause
