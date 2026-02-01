const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Process management
    getProcesses: () => ipcRenderer.invoke('get-processes'),
    killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
    getSystemStats: () => ipcRenderer.invoke('get-system-stats'),

    // VirusTotal scanning
    scanProcess: (processData) => ipcRenderer.invoke('scan-process', processData),
    getCachedScan: (hash) => ipcRenderer.invoke('get-cached-scan', hash),
    getScanQueue: () => ipcRenderer.invoke('get-scan-queue'),

    // Listeners
    onScanComplete: (callback) => ipcRenderer.on('scan-complete', (event, data) => callback(data)),
    onQueueUpdate: (callback) => ipcRenderer.on('scan-queue-update', (event, data) => callback(data)),

    // History and settings
    getScanHistory: () => ipcRenderer.invoke('get-scan-history'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    getSettings: () => ipcRenderer.invoke('get-settings'),

    // Whitelist
    addToWhitelist: (processHash) => ipcRenderer.invoke('add-to-whitelist', processHash)
});
