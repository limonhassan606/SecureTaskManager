# Bug Fix: API Not Configured Error

## Problem
Users were experiencing a "Scan Error: API not configured" message even after setting the VirusTotal API key in the settings.

## Root Cause
The `VirusTotalScanner` class was only loading the API key during initialization when the app started. When users saved new settings with an API key, the scanner instance was never notified to reload the configuration, so `this.apiKey` remained `null`.

## Solution
The fix involves two changes to `src/main/index.js`:

### 1. Initialize VirusTotal on App Startup (Line 40)
```javascript
app.whenReady().then(async () => {
  await database.initialize();
  await virusTotal.initialize(); // Load existing API key
  createWindow();
  // ...
});
```

This ensures that if a user has previously saved an API key, it gets loaded when the app starts.

### 2. Reinitialize After Saving Settings (Lines 95-97)
```javascript
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
```

This ensures that when a user saves a new API key, the VirusTotal scanner immediately loads it without requiring an app restart.

## Testing
To verify the fix:
1. Start the application
2. Go to Settings
3. Enter your VirusTotal API key
4. Save settings
5. Try scanning a process - it should now work without restarting the app

## Files Modified
- `src/main/index.js` - Added VirusTotal initialization calls
