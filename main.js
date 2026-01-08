const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let win;
let serverProcess;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { nodeIntegration: true },
  });

  // Load the frontend (React build)
  // If using `npm start` in frontend, it serves on localhost:3000
  win.loadURL('http://localhost:3000');

  // Start the backend server
  serverProcess = spawn('npm', ['run', 'start-server'], { shell: true, stdio: 'inherit' });

  win.on('closed', () => {
    if (serverProcess) serverProcess.kill();
    win = null;
  });
}

app.on('ready', createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
