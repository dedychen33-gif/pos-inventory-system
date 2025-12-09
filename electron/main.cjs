const { app, BrowserWindow, Menu, shell, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, '../public/images/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false // Allow loading local files
    },
    // Modern look
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#f8fafc'
  });

  // Load the app
  if (isDev) {
    // Development: load from Vite dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load the built index.html
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));
    mainWindow.loadFile(indexPath);
    
    // Open DevTools in production for debugging (remove later)
    // mainWindow.webContents.openDevTools();
  }

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        { 
          label: 'Reload', 
          accelerator: 'CmdOrCtrl+R', 
          click: () => mainWindow.reload() 
        },
        { type: 'separator' },
        { 
          label: 'Keluar', 
          accelerator: 'CmdOrCtrl+Q', 
          click: () => app.quit() 
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Potong' },
        { role: 'copy', label: 'Salin' },
        { role: 'paste', label: 'Tempel' },
        { role: 'selectAll', label: 'Pilih Semua' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Reset Zoom' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Fullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', label: 'Minimize' },
        { role: 'close', label: 'Tutup' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Tentang POS Pro',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Tentang POS Pro',
              message: 'POS Pro - Point of Sale & Inventory System',
              detail: 'Versi 1.0.0\n\nAplikasi kasir dan manajemen inventaris dengan integrasi marketplace.\n\n© 2024 Sinar Jaya Abadi'
            });
          }
        }
      ]
    }
  ];

  // Add DevTools in development
  if (isDev) {
    template[2].submenu.push(
      { type: 'separator' },
      { role: 'toggleDevTools', label: 'Developer Tools' }
    );
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App ready
app.whenReady().then(createWindow);

// Quit when all windows are closed (Windows/Linux)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS: re-create window when dock icon is clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle IPC messages from renderer
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});
