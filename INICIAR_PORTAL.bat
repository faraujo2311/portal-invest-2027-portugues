@echo off
chcp 65001 >nul
title Portal INVEST - Lingua Portuguesa
cd /d "%~dp0"
echo.
echo   INVEST - PORTAL DE ESTUDOS DE PORTUGUES
 echo.
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 iniciar.py
) else (
  python iniciar.py
)
if errorlevel 1 (
 echo.
 echo Python nao encontrado ou o servidor nao conseguiu iniciar.
 echo Instale Python e marque "Add Python to PATH".
 pause
)
