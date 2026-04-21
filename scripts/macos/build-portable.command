#!/bin/bash
clear
echo "========================================="
echo "  Build Portable - Claude Code Switcher"
echo "========================================="
echo ""

cd "$(dirname "$0")/../.."

if [ ! -d "node_modules" ]; then
    echo "[!] Dependências não encontradas. Instalando..."
    npm install
fi

if [ ! -f "package-lock.json" ]; then
    echo "[!] Instalando electron-builder..."
    npm install electron-builder --save-dev
fi

echo ""
echo "[+] Gerando versão portátil..."
echo ""

mkdir -p dist

if [[ "$(uname)" == "Darwin" ]]; then
    npx electron-builder --mac portable --dir
else
    npx electron-builder --linux portable --dir
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "[+] Build concluído com sucesso!"
    echo "[+] Versão portable em: dist/"
else
    echo ""
    echo "[!] Erro ao gerar build portátil."
    read -n 1
    exit 1
fi
