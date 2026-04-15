#!/bin/bash

# SVN Merge Tool - Web UI 启动脚本

echo "========================================="
echo "  SVN Merge Tool - Web UI"
echo "========================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 检查是否已构建
if [ ! -d "dist" ]; then
    echo "📦 首次运行，正在构建项目..."
    npm install
    npm run build
    echo ""
fi

# 启动 daemon
echo "🚀 启动 SVN Merge Tool Daemon..."
node dist/daemon-cli.js start

# 等待服务启动
sleep 2

# 检查服务状态
if node dist/daemon-cli.js status > /dev/null 2>&1; then
    echo ""
    echo "✅ 服务已启动！"
    echo ""
    echo "📍 访问地址:"
    echo "   Web UI:    http://localhost:36695/index.html"
    echo "   测试页面:  http://localhost:36695/test.html"
    echo "   API:       http://localhost:36695/api/health"
    echo "   WebSocket: ws://localhost:36695/ws"
    echo ""
    echo "💡 提示:"
    echo "   - 使用 Ctrl+C 停止服务"
    echo "   - 或运行: node dist/daemon-cli.js stop"
    echo ""
    
    # 尝试打开浏览器
    if command -v open &> /dev/null; then
        echo "🌐 正在打开浏览器..."
        open http://localhost:36695/index.html
    elif command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:36695/index.html
    fi
else
    echo ""
    echo "❌ 服务启动失败"
    echo "请检查日志: logs/daemon.log"
    exit 1
fi
