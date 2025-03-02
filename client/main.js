require("dotenv").config();
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");
const WebSocket = require("ws");
const http = require("http");
const wss = new WebSocket.Server({ port: 8181 });
const { VPS_HOST } = require("./env.json");
// const VPS_HOST = process.env.VPS_HOST;
// const USER_CONFIG = process.env.USER_CONFIG;

let win;

const configDir = path.join(__dirname, "openConfig");

if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 800,
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Обработчик события от рендера
ipcMain.on("download-config", () => {
  // Папка для сохранения конфигурации
  const savePath = path.join(__dirname, "openConfig");

  // Функция скачивания файла
  async function downloadConfig() {
    const url = `http://${VPS_HOST}:3000/download-free-config`;
    const filePath = path.join(savePath, "free_config.ovpn");

    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true }); // Создаем папку, если её нет
    }

    const file = fs.createWriteStream(filePath);

    http
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          dialog.showErrorBox(
            "Ошибка",
            `Ошибка скачивания: ${response.statusMessage}`
          );
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          dialog.showMessageBox({
            type: "info",
            title: "Загрузка завершена",
            message: `Конфигурация VPN успешно загружена в ${filePath}`,
          });
        });
      })
      .on("error", (err) => {
        dialog.showErrorBox("Ошибка загрузки", err.message);
      });
  }
  downloadConfig();
});

ipcMain.handle("connect-vpn", async (event, clientName) => {
  const configPath = path.join(configDir, `${clientName}.ovpn`);

  if (!fs.existsSync(configPath)) {
    event.sender.send("vpn-status", "Файл конфигурации не найден");
    return;
  }

  const vpnProcess = exec(`openvpn --config "${configPath}" --verb 3`);

  vpnProcess.stdout.on("data", (data) => {
    // Передаем лог в WebSocket клиентам
    // wss.clients.forEach((client) => {
    //   if (client.readyState === WebSocket.OPEN) {
    //     client.send(data.toString().trim() + "\n");
    //   }
    // });

    // Передаем лог в рендер-процесс Electron
    event.sender.send("vpn-log", data.toString().trim());
  });

  vpnProcess.stderr.on("data", (data) => {
    console.error("OpenVPN Error:", data);
    event.sender.send("vpn-log", "Ошибка: " + data.toString().trim());
  });

  vpnProcess.on("close", (code) => {
    console.log("OpenVPN отключен, код:", code);
    event.sender.send("vpn-status", "VPN отключен");
  });
  event.sender.send("vpn-status", "VPN подключен");
});

ipcMain.handle("disconnect-vpn", async (event) => {
  exec("taskkill /F /IM openvpn.exe", (error) => {
    if (error) {
      event.sender.send("vpn-status", "Ошибка отключения");
      return;
    }
    event.sender.send("vpn-status", "VPN отключен");
  });
});

// Когда все окна закрыты, завершаем приложение
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
