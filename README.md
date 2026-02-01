# SecureTask Manager

> Advanced Process Manager with VirusTotal Integration

A powerful Windows Task Manager alternative that scans running processes with VirusTotal to identify potential malware and security threats.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🔍 Process Monitoring
- **Real-time Process List** - View all running processes with detailed information
- **System Statistics** - Monitor CPU and memory usage
- **Process Management** - Kill, suspend, or analyze any process
- **Advanced Filtering** - Search and sort processes by various criteria

### 🛡️ VirusTotal Integration
- **Automated Scanning** - Scan process executables with VirusTotal API
- **Security Ratings** - Get instant threat assessments (Safe, Suspicious, Malicious)
- **Behavior Analysis** - View detailed malware behavior reports
- **Detection Results** - See which antivirus engines flagged the file
- **Smart Caching** - Avoid redundant scans with intelligent result caching

### 🎨 Premium UI/UX
- **Modern Dark Mode** - Beautiful glassmorphic design
- **Real-time Updates** - Live process monitoring every 5 seconds
- **Interactive Dashboard** - Visual statistics and quick actions
- **Smooth Animations** - Polished micro-interactions
- **Responsive Layout** - Works on all screen sizes

### 📊 Additional Features
- **Scan History** - Track all previous scans
- **Whitelist Management** - Mark trusted processes
- **Export Reports** - Save scan results
- **Rate Limit Handling** - Smart API request management

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Windows OS (for full process management features)
- VirusTotal API Key ([Get one free here](https://www.virustotal.com/gui/join-us))

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd K:/OTHERS/ProcessManager
   ```

2. **Install dependencies** (already done)
   ```bash
   npm install
   ```

3. **Run the application**
   ```bash
   npm start
   ```

### First-Time Setup

1. **Get VirusTotal API Key**
   - Visit [VirusTotal](https://www.virustotal.com/gui/join-us)
   - Sign up for a free account
   - Navigate to your profile to get your API key

2. **Configure the App**
   - Click the Settings icon (⚙️) in the top-right corner
   - Paste your VirusTotal API key
   - Enable auto-scan if desired
   - Click "Save Settings"

3. **Start Scanning**
   - Go to the "Processes" tab
   - Click "Scan" on any process
   - Or use "Scan All Processes" from the Dashboard

## 📖 Usage Guide

### Dashboard Tab
- View security statistics at a glance
- See total processes categorized by threat level
- Quick actions for scanning and refreshing

### Processes Tab
- Browse all running processes
- Search by name, path, or PID
- Sort by any column (name, CPU, memory, etc.)
- Scan individual processes
- View detailed process information
- Terminate suspicious processes

### History Tab
- Review all previous scans
- View detection rates
- Access full VirusTotal reports

### Process Details Modal
- Complete process information
- VirusTotal scan results
- Vendor-specific detections
- Behavior analysis
- Direct link to full VT report

## 🔐 Security & Privacy

- **Hash-Only Scanning**: Only file hashes are sent to VirusTotal, not the actual files
- **Local Caching**: Scan results are stored locally to minimize API calls
- **No Data Collection**: Your data stays on your machine
- **Open Source**: Full transparency in code

## ⚙️ Technical Details

### Built With
- **Electron** - Desktop application framework
- **Node.js** - Backend runtime
- **systeminformation** - Process enumeration
- **NeDB** - Local database for caching
- **Axios** - HTTP client for API requests

### Project Structure
```
ProcessManager/
├── src/
│   ├── main/
│   │   ├── index.js          # Electron main process
│   │   ├── processMonitor.js # Process management
│   │   ├── virusTotal.js     # VT API integration
│   │   └── database.js       # Local storage
│   ├── renderer/
│   │   ├── index.html        # Main UI
│   │   ├── css/
│   │   │   └── styles.css    # Premium styling
│   │   └── js/
│   │       └── app.js        # Application logic
│   └── preload.js            # Electron preload
├── package.json
└── README.md
```

### API Rate Limits
- **Free Tier**: 4 requests per minute
- **Strategy**: 15-second delay between scans
- **Caching**: Results cached for 7 days

## 🎯 Security Ratings Explained

| Rating | Criteria | Action |
|--------|----------|--------|
| **Safe** | 0 detections | No action needed |
| **Low Risk** | 1-3 detections | Review recommended |
| **Suspicious** | 4-10 detections | Investigate further |
| **Malicious** | 10+ detections | Terminate immediately |

## ⚠️ Important Notes

1. **Admin Privileges**: Some processes require admin rights to access
2. **False Positives**: Antivirus engines may flag legitimate software
3. **Rate Limits**: Free API has strict limits - be patient with bulk scans
4. **System Processes**: Be careful when terminating system processes

## 🐛 Troubleshooting

### "API key not configured"
- Open Settings and enter your VirusTotal API key

### "File not found in VirusTotal database"
- The file hasn't been scanned before on VT
- Rare or custom executables may not be in the database

### "Cannot scan this process"
- Process file is not accessible (system protection)
- No executable path available (some system processes)

### Processes not loading
- Run the app as Administrator
- Check if systeminformation module is installed

## 📝 Development

### Run in Development Mode
```bash
npm run dev
```

This opens DevTools automatically for debugging.

### Build for Production
```bash
npm run build
```

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 👨‍💻 Author

**LIMON HASAN**

## 🙏 Acknowledgments

- VirusTotal for their excellent API
- Electron team for the framework
- systeminformation for process data

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review VirusTotal API documentation
3. Open an issue on GitHub

---

**⚡ Built with passion for cybersecurity and system monitoring**
