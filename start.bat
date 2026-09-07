@echo off
echo ========================================================
echo   Iniciando Blackjack Multiplayer
echo ========================================================
echo.

IF NOT EXIST "node_modules" (
    echo [1/2] Instalando pacotes npm automaticamente...
    call npm install
    if errorlevel 1 (
        echo Erro ao instalar dependencias. Verifique se o Node.js esta instalado.
        pause
        exit /b 1
    )
) ELSE (
    echo Dependencias ja estao instaladas.
)

echo [2/2] Iniciando o servidor do Blackjack...
echo Abrindo em http://localhost:3000
start http://localhost:3000
call npm run dev
pause
