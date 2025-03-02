require("dotenv").config();
const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const { VPS_HOST} = require("./env.json");
// const USER_CONFIG = process.env.USER_CONFIG;
// const VPS_HOST = process.env.VPS_HOST;

// Элементы интерфейса
const freeVpnButton = document.getElementById("freeVpn");
const loginButton = document.getElementById("login");
const authForm = document.getElementById("authForm");
const modeSelection = document.getElementById("modeSelection");
const backToMenu = document.getElementById("backToMenu");
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const downloadConfig = document.getElementById("downloadBtn");

function addLog(message) {
  const logOutput = document.getElementById("logOutput");
  const newLine = document.createElement("div");
  newLine.textContent = message;
  logOutput.appendChild(newLine);
  logOutput.scrollTop = logOutput.scrollHeight;
}

// 1️⃣ Получаем логи через WebSocket
function setupWebSocket() {
  const socket = new WebSocket(`ws://${VPS_HOST}:8181`);

  socket.onopen = () => addLog("WebSocket подключен");
  socket.onmessage = (event) => addLog(event.data);
  socket.onclose = () => addLog("WebSocket отключен.");
  socket.onerror = (error) => addLog("WebSocket Error: " + error.message);
}

setupWebSocket();

// 2️⃣ Получаем логи через IPC от Electron
ipcRenderer.on("vpn-log", (event, message) => {
  addLog(message);
});

// // Запуск приложения первоночальное окно
const configPath = path.join(__dirname, "openConfig/free_config.ovpn");

// Проверяем, есть ли скачанный конфиг
if (fs.existsSync(configPath)) {
  freeVpnButton.innerText = "Подключиться";
}

// Обработка нажатия "Бесплатный VPN / Подключиться"
freeVpnButton.addEventListener("click", async () => {
  if (fs.existsSync(configPath)) {
    try {
      await ipcRenderer.invoke("connect-vpn", "free_config");
      addLog("VPN подключен");
    } catch (err) {
      addLog("Ошибка: " + err.message);
    }
  } else {
    ipcRenderer.send("download-config"); // Отправляем команду на скачивание
    freeVpnButton.innerText = "Подключиться";
  }
});

// Переход в окно авторизации
loginButton.addEventListener("click", () => {
  modeSelection.style.display = "none";
  authForm.style.display = "block";
});
// Возврат к выбору режима
backToMenu.addEventListener("click", () => {
  authForm.style.display = "none";
  modeSelection.style.display = "block";
});

// Обработка нажатия " Подключиться"
connectBtn.addEventListener("click", async () => {
  try {
    // const clientName = document.getElementById("server").value;
    const clientName = USER_CONFIG;
    await ipcRenderer.invoke("connect-vpn", clientName);
    addLog("VPN подключен");
  } catch (err) {
    addLog("Ошибка: " + err.message);
  }
});
// Обработка нажатия "Отключится"
disconnectBtn.addEventListener("click", async () => {
  try {
    await ipcRenderer.invoke("disconnect-vpn");
    addLog("VPN отключен");
  } catch (err) {
    addLog("Ошибка: " + err.message);
  }
});
// Обработка нажатия "скачать конфигурацион файл"
downloadConfig.addEventListener("click", async () => {
  try {
    const clientName = USER_CONFIG; // Имя клиента, которое мы берем из переменной окружения или инпута
    const url = `http://${VPS_HOST}:3000/download-config/${clientName}`;

    // Отправка GET запроса для скачивания файла
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Ошибка скачивания: ${response.statusText}`);
    }

    // Преобразование в Blob для скачивания
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${clientName}.ovpn`; // Устанавливаем имя для скачиваемого файла
    link.click();

    addLog(`Конфигурация скачана: ${clientName}.ovpn`);
  } catch (err) {
    addLog("Ошибка скачивания: " + err.message);
  }
});

// document.getElementById("freeVpn").addEventListener("click", async () => {
//   try {
//     const url = `http://${VPS_HOST}:3000/download-free-config`;

//     // const dest = path.join(__dirname, "openConfig");

//     // // Отправка GET запроса для скачивания файла
//     const response = await fetch(url);

//     if (!response.ok) {
//       throw new Error(`Ошибка скачивания: ${response.statusText}`);
//     }
//     // const file = fs.createWriteStream(dest);
//     // response.pipe(file);

//     // file.on("finish", () => {
//     //   file.close();
//     //   dialog.showMessageBox({
//     //       type: "info",
//     //       title: "Загрузка завершена",
//     //       message: "Конфигурация VPN успешно загружена!",
//     //   });
//   // });
//     // Преобразование в Blob для скачивания
//     const blob = await response.blob();
//     const link = document.createElement('a');
//     link.href = URL.createObjectURL(blob);
//     link.download = `free_config.ovpn`; // Устанавливаем имя для скачиваемого файла
//     link.click();

//     addLog(`Конфигурация скачана: free_config.ovpn`);
//   } catch (err) {
//     addLog("Ошибка скачивания: " + err.message);
//   }
// });

// document.getElementById("login").addEventListener("click", () => {
//   alert("Открываем окно авторизации...");
// });

// ipcRenderer.on("vpn-status", (event, status) => {
//   document.getElementById("status").innerText = status;
// });
