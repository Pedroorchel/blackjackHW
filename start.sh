#!/usr/bin/env bash
echo "========================================================"
echo "  Iniciando Blackjack Multiplayer"
echo "========================================================"

if [ ! -d "node_modules" ]; then
    echo "[1/2] Instalando pacotes npm automaticamente..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Erro ao instalar dependencias npm."
        exit 1
    fi
else
    echo "Dependencias ja instaladas."
fi

echo "[2/2] Iniciando o servidor em http://localhost:3000..."
if which xdg-open > /dev/null; then
    xdg-open http://localhost:3000 &
elif which open > /dev/null; then
    open http://localhost:3000 &
fi

npm run dev
