#!/bin/bash
cd "$(dirname "$0")/.."

clear
echo "========================================"
echo "  Iniciando Claude Code Switcher..."
echo "========================================"

if [ ! -d "node_modules" ]; then
    echo "[!] Dependências não encontradas. Instalando..."
    npm install
fi

npm start

if [ $? -ne 0 ]; then
    echo ""
    echo "[!] Ocorreu um erro ao iniciar o app."
    echo "Pressione qualquer tecla para fechar..."
    read -n 1
fi
