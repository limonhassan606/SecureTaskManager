// ===== STATE MANAGEMENT =====
const state = {
    processes: [],
    filteredProcesses: [],
    scanHistory: [],
    settings: {},
    currentSort: { column: 'name', direction: 'asc' },
    refreshInterval: null,
    scanQueue: []
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('SecureTask Manager initialized');

    // Load settings
    await loadSettings();

    // Setup event listeners
    setupEventListeners();

    // Load initial data
    await refreshProcesses();
    await loadScanHistory();

    // Start auto-refresh
    startAutoRefresh();

    // Show dashboard by default
    switchTab('dashboard');
});

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', openSettings);
    document.getElementById('settings-close-btn').addEventListener('click', closeSettings);
    document.getElementById('settings-cancel-btn').addEventListener('click', closeSettings);
    document.getElementById('settings-save-btn').addEventListener('click', saveSettings);

    // Process modal
    document.getElementById('modal-close-btn').addEventListener('click', closeProcessModal);

    // Refresh buttons
    document.getElementById('refresh-btn').addEventListener('click', refreshProcesses);
    document.getElementById('refresh-processes-btn').addEventListener('click', refreshProcesses);
    document.getElementById('scan-all-btn').addEventListener('click', scanAllProcesses);

    // Search
    document.getElementById('search-input').addEventListener('input', handleSearch);

    // Table sorting
    document.querySelectorAll('.process-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            handleSort(column);
        });
    });

    // Close modals on outside click
    document.getElementById('process-modal').addEventListener('click', (e) => {
        if (e.target.id === 'process-modal') {
            closeProcessModal();
        }
    });

    document.getElementById('settings-modal').addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal') {
            closeSettings();
        }
    });
}

// ===== TAB SWITCHING =====
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    // Load data for specific tabs
    if (tabName === 'history') {
        loadScanHistory();
    } else if (tabName === 'processes') {
        refreshProcesses();
    }
}

// ===== PROCESS MANAGEMENT =====
async function refreshProcesses() {
    try {
        const result = await window.electronAPI.getProcesses();

        if (result.error) {
            console.error('Error loading processes:', result.error);
            return;
        }

        state.processes = result.processes || [];
        state.filteredProcesses = [...state.processes];

        // Update UI
        updateProcessTable();
        updateDashboardStats();

    } catch (error) {
        console.error('Error refreshing processes:', error);
    }
}

function updateProcessTable() {
    const tbody = document.getElementById('process-table-body');

    if (state.filteredProcesses.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="7" class="loading-cell">
          <p>No processes found</p>
        </td>
      </tr>
    `;
        return;
    }

    tbody.innerHTML = state.filteredProcesses.map(proc => `
    <tr>
      <td>
        <span class="status-badge ${getStatusClass(proc.scanStatus)}">
          ${getStatusText(proc.scanStatus)}
        </span>
      </td>
      <td>${escapeHtml(proc.name)}</td>
      <td>${proc.pid}</td>
      <td>${proc.cpu.toFixed(1)}%</td>
      <td>${proc.memMB} MB</td>
      <td title="${escapeHtml(proc.path)}">${truncatePath(proc.path)}</td>
      <td>
        <button class="table-action-btn" onclick="scanProcess(${proc.pid})">
          Scan
        </button>
        <button class="table-action-btn" onclick="viewProcessDetails(${proc.pid})">
          Details
        </button>
        <button class="table-action-btn danger" onclick="killProcess(${proc.pid})">
          Kill
        </button>
      </td>
    </tr>
  `).join('');
}

function updateDashboardStats() {
    // Count processes by status
    const stats = {
        safe: 0,
        suspicious: 0,
        malicious: 0,
        unknown: 0,
        total: state.processes.length
    };

    state.processes.forEach(proc => {
        if (proc.rating === 'safe') stats.safe++;
        else if (proc.rating === 'suspicious' || proc.rating === 'low_risk') stats.suspicious++;
        else if (proc.rating === 'malicious') stats.malicious++;
        else stats.unknown++;
    });

    // Update stat cards
    document.getElementById('safe-count').textContent = stats.safe;
    document.getElementById('suspicious-count').textContent = stats.suspicious;
    document.getElementById('malicious-count').textContent = stats.malicious;
    document.getElementById('unknown-count').textContent = stats.unknown;
    document.getElementById('total-processes').textContent = stats.total;
}

async function scanProcess(pid) {
    const process = state.processes.find(p => p.pid === pid);
    if (!process) return;

    if (!process.hash) {
        alert('Cannot scan this process - no file hash available');
        return;
    }

    try {
        // Show loading state
        const result = await window.electronAPI.scanProcess(process);

        if (result.error) {
            alert(`Scan error: ${result.error}`);
            return;
        }

        if (result.status === 'not_configured') {
            alert('Please configure your VirusTotal API key in Settings');
            openSettings();
            return;
        }

        // Update process with scan result
        process.scanStatus = result.status;
        process.rating = result.rating;
        process.detections = result.detections;
        process.totalEngines = result.totalEngines;
        process.scanResult = result;

        // Refresh UI
        updateProcessTable();
        updateDashboardStats();

        // Show details
        viewProcessDetails(pid);

    } catch (error) {
        console.error('Error scanning process:', error);
        alert('Failed to scan process');
    }
}

async function scanAllProcesses() {
    if (!confirm('This will scan all processes with file hashes. This may take a while due to API rate limits. Continue?')) {
        return;
    }

    const processesToScan = state.processes.filter(p => p.hash && p.scanStatus === 'not_scanned');

    if (processesToScan.length === 0) {
        alert('No processes to scan');
        return;
    }

    alert(`Queued ${processesToScan.length} processes for scanning. This will take approximately ${Math.ceil(processesToScan.length * 15 / 60)} minutes due to API rate limits.`);

    // Scan processes one by one
    for (const proc of processesToScan) {
        await scanProcess(proc.pid);
        // Wait to respect rate limits (handled by backend)
    }
}

async function killProcess(pid) {
    if (!confirm(`Are you sure you want to terminate process ${pid}?`)) {
        return;
    }

    try {
        const result = await window.electronAPI.killProcess(pid);

        if (result.success) {
            alert('Process terminated successfully');
            await refreshProcesses();
        } else {
            alert(`Failed to terminate process: ${result.error}`);
        }
    } catch (error) {
        console.error('Error killing process:', error);
        alert('Failed to terminate process');
    }
}

function viewProcessDetails(pid) {
    const process = state.processes.find(p => p.pid === pid);
    if (!process) return;

    const modal = document.getElementById('process-modal');
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');

    modalTitle.textContent = `Process Details - ${process.name}`;

    let detailsHtml = `
    <div class="system-info">
      <div class="info-row">
        <span class="info-label">Process Name:</span>
        <span class="info-value">${escapeHtml(process.name)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">PID:</span>
        <span class="info-value">${process.pid}</span>
      </div>
      <div class="info-row">
        <span class="info-label">CPU Usage:</span>
        <span class="info-value">${process.cpu.toFixed(2)}%</span>
      </div>
      <div class="info-row">
        <span class="info-label">Memory:</span>
        <span class="info-value">${process.memMB} MB</span>
      </div>
      <div class="info-row">
        <span class="info-label">Path:</span>
        <span class="info-value" style="word-break: break-all;">${escapeHtml(process.path)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">User:</span>
        <span class="info-value">${escapeHtml(process.user)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Threads:</span>
        <span class="info-value">${process.threads}</span>
      </div>
      <div class="info-row">
        <span class="info-label">File Hash (SHA-256):</span>
        <span class="info-value" style="word-break: break-all; font-family: monospace; font-size: 0.7rem;">${process.hash || 'N/A'}</span>
      </div>
    </div>
  `;

    // Add scan results if available
    if (process.scanResult) {
        const result = process.scanResult;

        detailsHtml += `
      <div style="margin-top: 1.5rem;">
        <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-primary);">
          VirusTotal Analysis
        </h3>
        <div class="system-info">
          <div class="info-row">
            <span class="info-label">Security Rating:</span>
            <span class="status-badge ${getStatusClass(result.rating)}">${getStatusText(result.rating)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Detections:</span>
            <span class="info-value">${result.detections || 0} / ${result.totalEngines || 0} engines</span>
          </div>
          ${result.reputation !== undefined ? `
          <div class="info-row">
            <span class="info-label">Reputation:</span>
            <span class="info-value">${result.reputation}</span>
          </div>
          ` : ''}
          ${result.lastAnalysisDate ? `
          <div class="info-row">
            <span class="info-label">Last Analysis:</span>
            <span class="info-value">${new Date(result.lastAnalysisDate * 1000).toLocaleString()}</span>
          </div>
          ` : ''}
        </div>

        ${result.vendors && result.vendors.length > 0 ? `
        <div style="margin-top: 1rem;">
          <h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-secondary);">
            Vendor Detections:
          </h4>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
            ${result.vendors.map(v => `
              <span class="status-badge status-malicious" style="font-size: 0.7rem;">
                ${escapeHtml(v.name)}: ${escapeHtml(v.result)}
              </span>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${result.behavior && result.behavior.length > 0 ? `
        <div style="margin-top: 1rem;">
          <h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-secondary);">
            Behavior Tags:
          </h4>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
            ${result.behavior.map(b => `
              <span class="status-badge status-unknown" style="font-size: 0.7rem;">
                ${escapeHtml(b)}
              </span>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${process.hash ? `
        <div style="margin-top: 1rem;">
          <a href="https://www.virustotal.com/gui/file/${process.hash}" target="_blank" class="btn-primary" style="display: inline-flex; text-decoration: none;">
            View Full Report on VirusTotal
          </a>
        </div>
        ` : ''}
      </div>
    `;
    } else {
        detailsHtml += `
      <div style="margin-top: 1.5rem; text-align: center;">
        <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
          This process has not been scanned yet
        </p>
        <button class="btn-primary" onclick="scanProcess(${process.pid}); closeProcessModal();">
          Scan with VirusTotal
        </button>
      </div>
    `;
    }

    modalBody.innerHTML = detailsHtml;
    modal.classList.add('active');
}

function closeProcessModal() {
    document.getElementById('process-modal').classList.remove('active');
}

// ===== SCAN HISTORY =====
async function loadScanHistory() {
    try {
        const history = await window.electronAPI.getScanHistory();
        state.scanHistory = history || [];
        updateHistoryTable();
    } catch (error) {
        console.error('Error loading scan history:', error);
    }
}

function updateHistoryTable() {
    const tbody = document.getElementById('history-table-body');

    if (state.scanHistory.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="6" class="loading-cell">
          <p>No scan history available</p>
        </td>
      </tr>
    `;
        return;
    }

    tbody.innerHTML = state.scanHistory.map(scan => `
    <tr>
      <td>${new Date(scan.scanDate).toLocaleString()}</td>
      <td>${escapeHtml(scan.processName)}</td>
      <td style="font-family: monospace; font-size: 0.7rem;" title="${scan.hash}">
        ${scan.hash ? scan.hash.substring(0, 16) + '...' : 'N/A'}
      </td>
      <td>
        <span class="status-badge ${getStatusClass(scan.rating)}">
          ${getStatusText(scan.rating)}
        </span>
      </td>
      <td>${scan.detections || 0} / ${scan.totalEngines || 0}</td>
      <td>
        <a href="https://www.virustotal.com/gui/file/${scan.hash}" target="_blank" class="table-action-btn">
          View Report
        </a>
      </td>
    </tr>
  `).join('');
}

// ===== SETTINGS =====
async function loadSettings() {
    try {
        state.settings = await window.electronAPI.getSettings();
        console.log('Settings loaded:', state.settings);
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function openSettings() {
    const modal = document.getElementById('settings-modal');
    const apiKeyInput = document.getElementById('api-key-input');
    const autoScanCheckbox = document.getElementById('auto-scan-checkbox');

    apiKeyInput.value = state.settings.virusTotalApiKey || '';
    autoScanCheckbox.checked = state.settings.autoScan || false;

    modal.classList.add('active');
}

function closeSettings() {
    document.getElementById('settings-modal').classList.remove('active');
}

async function saveSettings() {
    const apiKey = document.getElementById('api-key-input').value.trim();
    const autoScan = document.getElementById('auto-scan-checkbox').checked;

    try {
        await window.electronAPI.saveSettings({
            virusTotalApiKey: apiKey,
            autoScan: autoScan
        });

        state.settings.virusTotalApiKey = apiKey;
        state.settings.autoScan = autoScan;

        alert('Settings saved successfully!');
        closeSettings();
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings');
    }
}

// ===== SEARCH & FILTER =====
function handleSearch(e) {
    const query = e.target.value.toLowerCase();

    if (!query) {
        state.filteredProcesses = [...state.processes];
    } else {
        state.filteredProcesses = state.processes.filter(proc =>
            proc.name.toLowerCase().includes(query) ||
            proc.path.toLowerCase().includes(query) ||
            proc.pid.toString().includes(query)
        );
    }

    updateProcessTable();
}

// ===== SORTING =====
function handleSort(column) {
    if (state.currentSort.column === column) {
        state.currentSort.direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.currentSort.column = column;
        state.currentSort.direction = 'asc';
    }

    state.filteredProcesses.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        // Handle different data types
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return state.currentSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return state.currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    updateProcessTable();
}

// ===== AUTO REFRESH =====
function startAutoRefresh() {
    // Refresh every 5 seconds
    state.refreshInterval = setInterval(async () => {
        await refreshProcesses();
        updateSystemStats();
    }, 5000);
}

async function updateSystemStats() {
    // Update header stats (CPU and Memory)
    if (state.processes.length > 0) {
        const totalCpu = state.processes.reduce((sum, p) => sum + p.cpu, 0);
        const totalMem = state.processes.reduce((sum, p) => sum + parseFloat(p.memMB), 0);

        document.getElementById('cpu-usage').textContent = `${totalCpu.toFixed(1)}%`;
        document.getElementById('mem-usage').textContent = `${(totalMem / 1024).toFixed(1)} GB`;

        document.getElementById('dashboard-cpu').textContent = `${totalCpu.toFixed(1)}%`;
        document.getElementById('dashboard-mem').textContent = `${(totalMem / 1024).toFixed(1)} GB`;
    }
}

// ===== UTILITY FUNCTIONS =====
function getStatusClass(status) {
    switch (status) {
        case 'safe':
        case 'whitelisted':
            return 'status-safe';
        case 'suspicious':
        case 'low_risk':
            return 'status-suspicious';
        case 'malicious':
            return 'status-malicious';
        default:
            return 'status-unknown';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'safe': return 'Safe';
        case 'whitelisted': return 'Whitelisted';
        case 'suspicious': return 'Suspicious';
        case 'low_risk': return 'Low Risk';
        case 'malicious': return 'Malicious';
        case 'not_scanned': return 'Not Scanned';
        case 'unknown': return 'Unknown';
        default: return 'Unknown';
    }
}

function truncatePath(path, maxLength = 50) {
    if (!path || path.length <= maxLength) return path;
    return '...' + path.substring(path.length - maxLength);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally accessible
window.scanProcess = scanProcess;
window.viewProcessDetails = viewProcessDetails;
window.killProcess = killProcess;
window.closeProcessModal = closeProcessModal;
