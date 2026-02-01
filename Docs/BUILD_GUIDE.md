# 🔨 Building SecureTask Manager as EXE

## Quick Build Commands

### Build Installer (Recommended)
```bash
npm run build
```
This creates a Windows installer with desktop shortcuts.

### Build Portable EXE
```bash
npm run build:portable
```
This creates a standalone portable executable (no installation needed).

### Build Both 64-bit and 32-bit
```bash
npm run build:all
```
This creates installers for both architectures.

## What Gets Created

After running `npm run build`, you'll find in the `dist/` folder:

1. **SecureTask Manager-1.0.0-x64.exe** - Full installer (NSIS)
2. **SecureTask Manager-1.0.0-Portable.exe** - Portable version (no install)

## Build Output Location

```
ProcessManager/
└── dist/
    ├── SecureTask Manager-1.0.0-x64.exe          (Installer ~150MB)
    ├── SecureTask Manager-1.0.0-Portable.exe     (Portable ~150MB)
    └── win-unpacked/                             (Unpacked files)
```

## Installation Types

### 1. Installer Version (NSIS)
- ✅ Creates Start Menu shortcuts
- ✅ Creates Desktop shortcut
- ✅ Adds to Programs & Features
- ✅ Automatic updates support
- ✅ Uninstaller included
- ✅ Custom install location

### 2. Portable Version
- ✅ No installation required
- ✅ Run from USB drive
- ✅ No registry changes
- ✅ Self-contained
- ✅ Perfect for testing

## Build Requirements

### Prerequisites
- ✅ Node.js installed
- ✅ npm packages installed (`npm install`)
- ✅ electron-builder installed (already done)

### Optional (for custom icon)
- Icon file: `assets/icon.ico` (256x256 recommended)
- If not provided, default Electron icon is used

## Step-by-Step Build Process

### 1. Prepare for Build
```bash
# Make sure all dependencies are installed
npm install

# Test the app first
npm start
```

### 2. Build the Application
```bash
# Build installer
npm run build
```

### 3. Wait for Build
- First build takes 5-10 minutes (downloads Electron binaries)
- Subsequent builds are faster (2-3 minutes)
- Watch the console for progress

### 4. Find Your EXE
- Navigate to `dist/` folder
- Find `SecureTask Manager-1.0.0-x64.exe`
- This is your installer!

## Build Configuration

The build is configured in `package.json` under the `build` section:

```json
{
  "build": {
    "appId": "com.limonhasan.securetask",
    "productName": "SecureTask Manager",
    "win": {
      "target": ["nsis", "portable"],
      "requestedExecutionLevel": "requireAdministrator"
    }
  }
}
```

### Key Settings

- **appId**: Unique identifier for your app
- **productName**: Display name
- **requestedExecutionLevel**: Runs with admin privileges (needed for process management)
- **target**: Creates both installer and portable versions

## Customization

### Change App Version
Edit `package.json`:
```json
{
  "version": "1.0.1"
}
```

### Change App Name
Edit `package.json`:
```json
{
  "build": {
    "productName": "Your Custom Name"
  }
}
```

### Add Custom Icon
1. Create/download a 256x256 icon
2. Convert to `.ico` format
3. Save as `assets/icon.ico`
4. Rebuild

## Distribution

### Installer Version
- Share `SecureTask Manager-1.0.0-x64.exe`
- Users run it to install
- Creates shortcuts automatically
- ~150MB file size

### Portable Version
- Share `SecureTask Manager-1.0.0-Portable.exe`
- Users run directly (no install)
- Perfect for USB drives
- ~150MB file size

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
npm run build -- --clean
```

### Missing Icon Error
- Create a simple `icon.ico` file in `assets/`
- Or remove icon references from `package.json`

### Permission Errors
- Run terminal as Administrator
- Check antivirus isn't blocking

### Large File Size
- Normal for Electron apps (~150MB)
- Includes Node.js + Chromium runtime
- Can't be significantly reduced

## Advanced Options

### Build for 32-bit Windows
```bash
npm run build -- --ia32
```

### Build Without Installer
```bash
npm run build -- --dir
```
Creates unpacked folder only (for testing).

### Code Signing (Optional)
For production apps, add code signing certificate:
```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/cert.pfx",
      "certificatePassword": "password"
    }
  }
}
```

## Testing the Build

### Before Distribution
1. Build the installer
2. Install on a clean Windows machine
3. Test all features
4. Check admin privileges work
5. Verify VirusTotal scanning
6. Test process management

### Portable Version Testing
1. Copy to USB drive
2. Run on different PC
3. Verify all features work
4. Check data persistence

## File Size Optimization

The app is large (~150MB) because it includes:
- Electron runtime (~100MB)
- Node.js modules (~30MB)
- Your app code (~5MB)
- Dependencies (~15MB)

This is normal for Electron apps and cannot be significantly reduced.

## Publishing

### GitHub Releases
1. Create a release on GitHub
2. Upload the installer exe
3. Users can download directly

### Website Distribution
1. Host the exe on your server
2. Provide download link
3. Include SHA-256 checksum

### Microsoft Store (Advanced)
- Requires appx package
- Additional configuration needed
- See electron-builder docs

## Auto-Updates (Future)

To enable auto-updates:
1. Setup update server
2. Add electron-updater
3. Configure update URL
4. Rebuild

## Build Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run build` | Build installer (64-bit) |
| `npm run build:portable` | Build portable exe |
| `npm run build:all` | Build all versions |
| `npm start` | Run in development |
| `npm run dev` | Run with DevTools |

## Support

### Build Issues
- Check Node.js version (v16+)
- Update electron-builder: `npm update electron-builder`
- Clear node_modules: `rm -rf node_modules && npm install`

### Runtime Issues
- Ensure Windows 10+ (64-bit)
- Install Visual C++ Redistributable
- Run as Administrator

---

**Ready to build?** Run `npm run build` and wait for your exe! 🚀

**Questions?** Check the electron-builder documentation: https://www.electron.build/
