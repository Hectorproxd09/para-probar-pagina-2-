const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700
  });

  win.loadFile('index.html'); // tu archivo HTML
}

app.whenReady().then(() => {
  createWindow();
});
