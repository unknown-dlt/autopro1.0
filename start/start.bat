@echo off
REM Определяем папку, где лежит этот .bat
set "SCRIPT_DIR=%~dp0"

REM Переходим в корень проекта (папка выше, чем start)
cd /d "%SCRIPT_DIR%\.."

echo === AutoPro local start (CMD) ===

REM Запускаем PowerShell-скрипт, который ставит зависимости и запускает проект
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start.ps1"

pause

