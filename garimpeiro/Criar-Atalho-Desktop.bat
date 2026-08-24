@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Criar Atalho do Garimpeiro
color 0B

cd /d "%~dp0"

echo.
echo  Criando atalho do Garimpeiro na area de trabalho...
echo.

set "PROJETO=%~dp0"
set "TARGET=%PROJETO%Garimpeiro.bat"
set "DESKTOP=%USERPROFILE%\Desktop"
set "ATALHO=%DESKTOP%\Garimpeiro Shopee.lnk"

powershell -NoProfile -Command ^
  "$s = New-Object -ComObject WScript.Shell;" ^
  "$lnk = $s.CreateShortcut('%ATALHO%');" ^
  "$lnk.TargetPath = '%TARGET%';" ^
  "$lnk.WorkingDirectory = '%PROJETO%';" ^
  "$lnk.IconLocation = '%SystemRoot%\System32\SHELL32.dll,170';" ^
  "$lnk.Description = 'Garimpeiro - Shopee Affiliate AI';" ^
  "$lnk.WindowStyle = 1;" ^
  "$lnk.Save()"

if exist "%ATALHO%" (
    echo  [OK] Atalho criado em: %ATALHO%
    echo.
    echo  Agora voce pode dar duplo clique no atalho da
    echo  area de trabalho pra abrir o Garimpeiro.
) else (
    echo  [X] Falha ao criar atalho.
)

echo.
pause
