# 🚀 Quick Start Guide

## Running the Application

```bash
npm start
```

The application should launch automatically!

## First Steps

### 1️⃣ Configure VirusTotal API
- Click the **Settings** icon (⚙️) in the top-right corner
- Get your free API key from: https://www.virustotal.com/gui/join-us
- Paste it in the API Key field
- Click **Save Settings**

### 2️⃣ View Processes
- Click the **Processes** tab
- You'll see all running processes on your system
- Use the search bar to filter processes

### 3️⃣ Scan a Process
- Click the **Scan** button next to any process
- Wait for the VirusTotal analysis (takes ~15 seconds)
- View the security rating and detections

### 4️⃣ View Details
- Click **Details** to see complete process information
- View VirusTotal scan results
- See vendor detections and behavior analysis

### 5️⃣ Take Action
- **Safe processes**: No action needed
- **Suspicious processes**: Research online
- **Malicious processes**: Click **Kill** to terminate

## Dashboard Features

### Security Stats
- **Safe Processes**: Verified clean by VirusTotal
- **Suspicious**: Low number of detections (1-10)
- **Malicious**: High number of detections (10+)
- **Unknown**: Not yet scanned

### Quick Actions
- **Scan All Processes**: Bulk scan (takes time due to rate limits)
- **Refresh Processes**: Update the process list

## Tips & Tricks

✅ **Auto-refresh**: Process list updates every 5 seconds automatically

✅ **Smart caching**: Scan results are cached for 7 days to save API calls

✅ **Sort & filter**: Click column headers to sort, use search to filter

✅ **History**: Check the History tab to review past scans

✅ **Whitelist**: Mark trusted processes to skip future scans

## Important Notes

⚠️ **Rate Limits**: Free VirusTotal API allows 4 requests/minute
- Expect ~15 seconds between scans
- Bulk scanning takes time

⚠️ **Admin Rights**: Some processes require administrator privileges
- Run as admin for full access

⚠️ **False Positives**: Some legitimate software may be flagged
- Check multiple vendor detections
- Research the process online

⚠️ **System Processes**: Be careful terminating system processes
- Can cause system instability
- Only kill if you're certain it's malware

## Keyboard Shortcuts

- **Ctrl+R**: Refresh processes
- **Ctrl+F**: Focus search
- **Esc**: Close modals

## Troubleshooting

### App won't start
```bash
# Reinstall dependencies
npm install

# Try again
npm start
```

### "API key not configured"
- Open Settings (⚙️)
- Add your VirusTotal API key
- Save settings

### Scans fail
- Check your internet connection
- Verify API key is correct
- Wait for rate limit (15 seconds between scans)

### Can't kill process
- Run the app as Administrator
- Some system processes are protected

## Development Mode

Run with DevTools open:
```bash
npm run dev
```

## Need Help?

1. Check **CONFIGURATION.md** for detailed setup
2. Read **README.md** for full documentation
3. Visit VirusTotal documentation

---

**Enjoy secure process monitoring!** 🛡️
