
@echo off
SET NODE_VERSION=v22  :: Задайте нужную версию Node.js
SET NODE_INSTALLER=node-v%NODE_VERSION%-x64.msi  :: Имя файла установщика

echo ================================
echo Start VPN...
echo ================================

cd client

:: Проверка, установлен ли Node.js
node -v >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Node.js not found. download...
    :: Скачивание установщика Node.js
    curl -o %NODE_INSTALLER% https://nodejs.org/dist/v%NODE_VERSION%/%NODE_INSTALLER%
    
    :: Установка Node.js
    msiexec /i %NODE_INSTALLER% /quiet /norestart
    
    :: Удаление установщика после установки
    del %NODE_INSTALLER%
) ELSE (
    echo Node.js also download, start app.
)

:: Проверка наличия зависимостей
if not exist "node_modules" (
    echo init dependencies...
    npm install
npm start
)

:: Запуск приложения
npm start
