@echo off
title OffertGames - Localhost
cd /d "%~dp0"
echo ===================================================
echo   INICIANDO SERVIDOR LOCAL DE OFFERTGAMES
echo ===================================================
echo.
echo 1. Abriendo tu navegador en http://localhost:5173...
start "" "http://localhost:5173"
echo 2. Iniciando servidor Vite en vivo...
echo.
npm run dev
pause
