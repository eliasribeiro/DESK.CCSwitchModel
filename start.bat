@echo off
TITLE Claude Code Switcher
echo ========================================
echo   Iniciando Claude Code Switcher...
echo ========================================

IF NOT EXIST node_modules (
    echo [!] Dependencias nao encontradas. Instalando...
    npm install
)

npm start
if %ERRORLEVEL% NEQ 0 (
    echo [!] Ocorreu um erro ao iniciar o app.
    pause
)
