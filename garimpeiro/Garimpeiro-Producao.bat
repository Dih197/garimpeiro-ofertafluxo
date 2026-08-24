@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Garimpeiro - Build de Producao
color 0A

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
echo  ║   GARIMPEIRO - BUILD DE PRODUCAO              ║
echo  ║   (mais rapido, recomendado pra uso diario)  ║
echo  ╚══════════════════════════════════════════════╝
echo.

if not exist "node_modules\" (
    echo [!] Instalando dependencias...
    call npm install --no-audit --no-fund
)

echo.
echo [1/2] Buildando para producao...
call npm run build
if errorlevel 1 (
    echo.
    echo [X] Falha no build.
    pause
    exit /b 1
)

echo.
echo [2/2] Iniciando servidor...
echo  Servidor: http://localhost:3000
echo.

start "" /B cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

call npm start

pause
