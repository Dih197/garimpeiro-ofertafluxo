@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Garimpeiro - Shopee Affiliate AI
color 0E

cd /d "%~dp0"

:: Evita iniciar uma segunda cópia do painel na mesma porta.
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul
if not errorlevel 1 (
    echo.
    echo [OK] O Garimpeiro ja esta rodando em http://localhost:3000
    echo      Reutilizando o servidor existente...
    start "" /B cmd /c "start http://localhost:3000"
    timeout /t 2 /nobreak >nul
    exit /b 0
)

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║                                              ║
echo  ║     GARIMPEIRO - SHOPEE AFFILIATE AI         ║
echo  ║                                              ║
echo  ║     Iniciando seu app de afiliado...         ║
echo  ║                                              ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: Verifica Node
where node >nul 2>&1
if errorlevel 1 (
    echo [X] Node.js nao encontrado.
    echo.
    echo Instale em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node %NODE_VER% encontrado

:: Verifica node_modules
if not exist "node_modules\" (
    echo.
    echo [!] Primeira execucao. Instalando dependencias... (vai demorar 2-3 min^)
    echo.
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo.
        echo [X] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
)

:: Verifica .env.local
if not exist ".env.local" (
    if exist ".env.local.example" (
        echo [!] Criando .env.local a partir do template...
        copy /Y ".env.local.example" ".env.local" >nul
        echo [OK] Lembre de editar .env.local com suas chaves reais
    )
)

echo [OK] Tudo pronto.
echo.
echo  Servidor: http://localhost:3000
echo  O navegador vai abrir em alguns segundos...
echo.
echo  Pra parar: feche esta janela ou Ctrl+C
echo.

:: Aguarda 4s e abre o navegador
start "" /B cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

:: Roda em modo producao se .next existe, senao dev
if exist ".next\BUILD_ID" (
    call npm start
) else (
    call npm run dev
)

pause
