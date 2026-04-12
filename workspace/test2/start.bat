@echo off
echo ========================================
echo   LumiCore MCP + OpenClaw Launcher
echo ========================================

echo [1/2] Starting LumiCore MCP tools server (stdio)...
start "LumiCore MCP Tools" cmd /k "node mcp-server.js"

timeout /t 2 /nobreak >nul

echo [2/2] Starting OpenClaw Gateway...
start "OpenClaw Gateway" cmd /k "npx openclaw gateway"

echo.
echo Everything is running!
echo    OpenClaw Gateway is running.
