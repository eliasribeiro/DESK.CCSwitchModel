@echo off
setlocal

echo ========================================
echo   Build Portable - Claude Code Switcher
echo ========================================
echo.

cd /d "%~dp0..\.."

if not exist "node_modules" (
    echo [!] Dependencias nao encontradas. Instalando...
    call npm install
)

if not exist "package-lock.json" (
    echo [!] Instalando electron-builder...
    call npm install electron-builder --save-dev
)

echo.
echo [+] Gerando versão portátil...
echo.

if not exist "dist" mkdir dist

npx electron-builder --win portable --dir

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [+] Build concluído com sucesso!
    echo [+] Versão portable em: dist\win-unpacked
) else (
    echo.
    echo [!] Erro ao gerar build portátil.
    pause
    exit /b 1
)

endlocal
