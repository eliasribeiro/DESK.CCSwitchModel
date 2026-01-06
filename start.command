#!/bin/bash
# Navega para o diretório onde o script está localizado
cd "$(dirname "$0")"

clear
echo "========================================"
echo "  Iniciando Claude Code Switcher..."
echo "========================================"

# Verifica se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "[!] Dependências não encontradas. Instalando..."
    npm install
fi

# Executa o app
npm start

# Se houver erro, mantém o terminal aberto para leitura
if [ $? -ne 0 ]; then
    echo ""
    echo "[!] Ocorreu um erro ao iniciar o app."
    echo "Pressione qualquer tecla para fechar..."
    read -n 1
fi
