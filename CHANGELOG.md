# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-02-01

### Added
- **Initial Release**
- Real-time Process Monitoring using `systeminformation`.
- **VirusTotal Integration**: Scan running processes for malware using SHA-256 hashes.
- **Background Queue System**:
    - `hashQueue`: Calculates file hashes in the background to prevent UI lag.
    - `scanQueue`: Queues API requests to respect VirusTotal rate limits.
- **Dashboard**:
    - Real-time System Stats (CPU/Memory).
    - Quick Actions: "Scan New Processes", "Scan All Processes".
    - Status Cards: Safe, Suspicious, Malicious, Unknown counts.
- **Processes Tab**:
    - Detailed process list with PID, CPU, Memory, Path.
    - Filters: All, Safe, Suspicious, Malicious, Not Scanned.
    - Status indicators (Calculating hash, Access Denied, etc.).
- **Queue Tab**: Monitor background scanning progress.
- **History Tab**: View logs of all previous scans with ratings and detection counts.
- **Native Menu Bar**: File, View, Window, Help menus for better UX.
- **Settings Store**: Persist API keys and preferences using `nedb-promises`.

### Fixed
- Performance issues related to synchronous hash calculation.
- Improved memory usage reporting.
- Corrected dashboard statistics aggregation.
