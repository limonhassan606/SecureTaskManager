# SecureTask Manager - Configuration Guide

## Getting Your VirusTotal API Key

1. Visit https://www.virustotal.com/gui/join-us
2. Sign up for a free account
3. Verify your email address
4. Go to your profile settings
5. Navigate to the "API Key" section
6. Copy your API key

## Configuring the Application

1. Launch SecureTask Manager
2. Click the Settings icon (⚙️) in the top-right
3. Paste your API key in the "API Key" field
4. Optionally enable "Auto-scan new processes"
5. Click "Save Settings"

## Understanding Scan Results

### Security Ratings
- **Safe**: No antivirus engines detected threats
- **Low Risk**: 1-3 engines flagged (possible false positive)
- **Suspicious**: 4-10 engines flagged (investigate)
- **Malicious**: 10+ engines flagged (likely malware)

### What to Do
- **Safe**: No action needed
- **Low Risk**: Research the process online
- **Suspicious**: Check if it's a known application
- **Malicious**: Terminate immediately and run full system scan

## Best Practices

1. **Don't terminate system processes** unless you're certain
2. **Research unknown processes** before taking action
3. **Keep your API key private** - don't share it
4. **Be patient with scans** - free API has rate limits
5. **Use whitelist** for known safe applications

## Troubleshooting

### Scan fails with "Rate limit exceeded"
- Wait 15 seconds between scans
- Free tier allows 4 requests per minute

### Process shows "No hash available"
- System process or protected file
- Cannot be scanned without file access

### High false positive rate
- Some legitimate software triggers AV heuristics
- Check vendor detections - look for reputable engines
- Research the software online

## Advanced Usage

### Bulk Scanning
- Use "Scan All Processes" from Dashboard
- Expect ~15 seconds per process (rate limiting)
- Results are cached for 7 days

### Whitelist Management
- Scan a trusted process first
- Results will show whitelist option
- Whitelisted processes skip future scans

### Export Reports
- Scan history is automatically saved
- Access from History tab
- Click "View Report" for full VT analysis

## Privacy & Security

- Only file hashes are sent to VirusTotal
- No actual files are uploaded
- All data stored locally
- No telemetry or tracking

## Support

For help:
1. Check this guide
2. Review README.md
3. Visit VirusTotal documentation
4. Contact support

---

**Stay safe and monitor wisely!** 🛡️
