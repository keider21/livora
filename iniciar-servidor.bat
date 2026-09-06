@echo off
chcp 65001 >nul
title Livora Stream - servidor
cd /d "%~dp0"

echo.
echo   Livora Stream - arrancando el servidor...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [!] No tienes Node.js instalado.
  echo.
  echo   Se abrira la pagina de descarga. Instala la version LTS,
  echo   cierra esta ventana y vuelve a hacer doble clic en este archivo.
  echo.
  pause
  start "" https://nodejs.org
  exit /b 1
)

call npm start

echo.
echo   El servidor se ha detenido.
pause
