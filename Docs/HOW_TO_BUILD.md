# 🎯 How to Build SecureTask Manager as EXE

## ✅ Quick Answer

Run this command to build your application:

```bash
npm run build
```

That's it! Your `.exe` files will be in the `dist/` folder.

---

## 📦 What You'll Get

After building, you'll have **TWO executable files**:

### 1. **Installer Version** (Recommended)
- **File**: `dist/SecureTask Manager-1.0.0-x64.exe`
- **Size**: ~150 MB
- **Type**: NSIS Installer
- **Features**:
  - ✅ Creates desktop shortcut
  - ✅ Creates Start Menu entry
  - ✅ Adds to Programs & Features
  - ✅ Includes uninstaller
  - ✅ User can choose install location

### 2. **Portable Version**
- **File**: `dist/SecureTask Manager-1.0.0-Portable.exe`
- **Size**: ~150 MB
- **Type**: Standalone executable
- **Features**:
  - ✅ No installation needed
  - ✅ Run from anywhere (USB drive, etc.)
  - ✅ No registry changes
  - ✅ Perfect for testing

---

## 🚀 Step-by-Step Build Process

### Step 1: Prepare
Make sure you're in the project directory:
```bash
cd K:/OTHERS/ProcessManager
```

### Step 2: Build
Run the build command:
```bash
npm run build
```

### Step 3: Wait
- **First build**: 5-10 minutes (downloads Electron binaries)
- **Subsequent builds**: 2-3 minutes
- You'll see progress in the terminal

### Step 4: Find Your Files
Navigate to the `dist/` folder:
```
K:/OTHERS/ProcessManager/dist/
├── SecureTask Manager-1.0.0-x64.exe          ← Installer
├── SecureTask Manager-1.0.0-Portable.exe     ← Portable
└── win-unpacked/                             ← Unpacked files
```

---

## 🎨 Icon Setup (Optional but Recommended)

The app icon has been generated for you! To use it:

### Option 1: Use Online Converter (Easiest)
1. I've generated `app_icon.png` for you (see above)
2. Go to https://convertio.co/png-ico/
3. Upload the PNG image
4. Download as `icon.ico`
5. Save to `K:/OTHERS/ProcessManager/assets/icon.ico`
6. Rebuild: `npm run build`

### Option 2: Use ImageMagick (if installed)
```bash
magick convert app_icon.png -define icon:auto-resize=256,128,64,48,32,16 assets/icon.ico
```

### Option 3: Skip Custom Icon
- The build will work without a custom icon
- It will use the default Electron icon
- You can add it later and rebuild

---

## 📋 Build Commands Reference

| Command | What It Does |
|---------|--------------|
| `npm run build` | Build installer (64-bit) |
| `npm run build:portable` | Build portable exe only |
| `npm run build:all` | Build both 64-bit and 32-bit |

---

## ⚙️ Build Configuration

The build settings are in `package.json`:

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

**Key Points**:
- ✅ Runs with **admin privileges** (needed for process management)
- ✅ Creates **both installer and portable** versions
- ✅ 64-bit Windows only (most common)

---

## 🔧 Troubleshooting

### Build Fails with "Icon not found"
**Solution**: Either create `assets/icon.ico` or temporarily remove icon references:

Edit `package.json` and remove these lines:
```json
"icon": "assets/icon.ico",
"installerIcon": "assets/icon.ico",
"uninstallerIcon": "assets/icon.ico",
```

Then rebuild.

### Build Takes Forever
- **First build**: Normal! It downloads ~200MB of Electron binaries
- **Subsequent builds**: Should be much faster (2-3 min)

### "Cannot find module" Error
```bash
npm install
npm run build
```

### Permission Denied
Run PowerShell/CMD as **Administrator**

### Antivirus Blocks Build
- Temporarily disable antivirus
- Or add exception for the `dist/` folder

---

## 📤 Distributing Your App

### For End Users (Installer)
1. Share `SecureTask Manager-1.0.0-x64.exe`
2. Users double-click to install
3. Installer creates shortcuts automatically
4. App runs with admin privileges

### For Testing (Portable)
1. Share `SecureTask Manager-1.0.0-Portable.exe`
2. Users run directly (no install)
3. Perfect for USB drives or quick testing

### File Size Note
- The exe is ~150MB (normal for Electron apps)
- Includes Node.js + Chromium runtime
- Cannot be significantly reduced

---

## 🎯 Quick Build Checklist

- [ ] Navigate to project folder
- [ ] Run `npm run build`
- [ ] Wait 5-10 minutes (first time)
- [ ] Check `dist/` folder for exe files
- [ ] Test the installer on a clean machine
- [ ] Distribute to users!

---

## 💡 Pro Tips

### Versioning
Update version in `package.json` before building:
```json
{
  "version": "1.0.1"
}
```

### Testing Before Distribution
1. Build the installer
2. Install on a **different PC** (or VM)
3. Test all features
4. Verify admin privileges work
5. Check VirusTotal integration

### Reducing Build Time
- Keep `node_modules/` folder
- Don't delete `dist/` between builds
- electron-builder caches downloads

---

## 📞 Need Help?

### Common Issues
- **Icon errors**: Skip icon or use online converter
- **Build fails**: Run `npm install` again
- **Large file size**: Normal for Electron apps
- **Slow build**: First build is always slow

### Resources
- **electron-builder docs**: https://www.electron.build/
- **Electron docs**: https://www.electronjs.org/
- **BUILD_GUIDE.md**: Full detailed guide in project

---

## 🎉 You're Ready!

Just run:
```bash
npm run build
```

And in 5-10 minutes, you'll have your professional Windows installer! 🚀

**The exe will be in**: `K:/OTHERS/ProcessManager/dist/`

**Share it with users and enjoy!** 🛡️
