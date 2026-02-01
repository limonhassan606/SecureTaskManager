const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const processMonitor = require('./processMonitor');
const virusTotal = require('./virusTotal');
const database = require('./database');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0a0e27',
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    frame: true,
    icon: path.join(__dirname, '../../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await database.initialize();
  await virusTotal.initialize();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-processes', async () => {
  try {
    return await processMonitor.getProcessList();
  } catch (error) {
    console.error('Error getting processes:', error);
    return { error: error.message };
  }
});

ipcMain.handle('kill-process', async (event, pid) => {
  try {
    return await processMonitor.killProcess(pid);
  } catch (error) {
    console.error('Error killing process:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scan-process', async (event, processData) => {
  try {
    return await virusTotal.scanProcess(processData);
  } catch (error) {
    console.error('Error scanning process:', error);
    return { error: error.message };
  }
});

ipcMain.handle('get-scan-history', async () => {
  try {
    return await database.getScanHistory();
  } catch (error) {
    console.error('Error getting scan history:', error);
    return { error: error.message };
  }
});

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    const result = await database.saveSettings(settings);
    // Reinitialize VirusTotal scanner to load the new API key
    await virusTotal.initialize();
    return result;
  } catch (error) {
    console.error('Error saving settings:', error);
    return { error: error.message };
  }
});

ipcMain.handle('get-settings', async () => {
  try {
    return await database.getSettings();
  } catch (error) {
    console.error('Error getting settings:', error);
    return { error: error.message };
  }
});

ipcMain.handle('add-to-whitelist', async (event, processHash) => {
  try {
    return await database.addToWhitelist(processHash);
  } catch (error) {
    console.error('Error adding to whitelist:', error);
    return { error: error.message };
  }
});

ipcMain.handle('get-cached-scan', async (event, hash) => {
  try {
    return await database.getCachedScan(hash);
  } catch (error) {
    console.error('Error getting cached scan:', error);
    return null;
  }
});
