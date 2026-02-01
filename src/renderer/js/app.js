// ===== STATE MANAGEMENT =====
const state = {
  processes: [], // The raw list of processes from backend
  processMetadata: new Map(), // Stores scan results/ratings keyed by PID (or Path)
  filteredProcesses: [],
  scanHistory: [],
  scanQueue: [],
  settings: {},
  currentSort: { column: 'name', direction: 'asc' },
  refreshInterval: null,
  activeFilters: new Set(['all']) // Default to showing all
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
  console.log('SecureTask Manager initialized');

  // Load settings
  await loadSettings();

  // Setup event listeners
  setupEventListeners();

  // Setup IPC listeners
  setupIPCListeners();

  // Load initial data
  await refreshProcesses();
  await loadScanHistory();
  await updateScanQueue();

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
  document.getElementById('scan-all-btn').addEventListener('click', () => scanAllProcesses(false));
  document.getElementById('scan-new-btn').addEventListener('click', () => scanAllProcesses(true));

  // Help/Update buttons
  document.getElementById('check-updates-btn').addEventListener('click', () => {
    // Open GitHub releases page
    window.open('https://github.com/limonhassan606/SecureTaskManager/releases', '_blank');
  });

  document.getElementById('repo-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.open('https://github.com/limonhassan606/SecureTaskManager', '_blank');
  });

  // Search
  document.getElementById('search-input').addEventListener('input', handleSearch);

  // Filter Select
  document.getElementById('filter-select').addEventListener('change', (e) => toggleFilter(e.target.value));

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

function setupIPCListeners() {
  // Listen for scan completion
  window.electronAPI.onScanComplete((data) => {
    // data = { hash, pid, result }
    console.log('Scan complete:', data);

    // Update metadata map
    // We use PID to find currently running process, but really we should map by Hash if possible, 
    // or path. For now, let's update by PID if provided, and also find by hash.

    // Update history
    loadScanHistory();

    // Update active process list if it matches
    if (data.pid) {
      const existingMeta = state.processMetadata.get(data.pid) || {};
      state.processMetadata.set(data.pid, {
        ...existingMeta,
        ...data.result,
        scanStatus: data.result.status
      });
    }

    // Refresh UI
    refreshProcesses(); // Logic to merge/filter will run
    viewProcessDetails(data.pid); // Re-open details if open
  });

  // Listen for queue updates
  window.electronAPI.onQueueUpdate((queue) => {
    state.scanQueue = queue;
    updateQueueTable();
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
  } else if (tabName === 'queue') {
    updateScanQueue();
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

    const newProcesses = result.processes || [];

    // 1. Build Scan History Map for fast lookup
    const historyMap = new Map();
    if (state.scanHistory && state.scanHistory.length > 0) {
      state.scanHistory.forEach(scan => {
        // Use the most recent scan for a given hash
        if (scan.hash && !historyMap.has(scan.hash)) {
          historyMap.set(scan.hash, scan);
        }
      });
    }

    // 2. Merge with existing metadata AND history matching
    state.processes = newProcesses.map(proc => {
      // Priority 1: Current session metadata (most up to date)
      const meta = state.processMetadata.get(proc.pid);
      if (meta) {
        return { ...proc, ...meta };
      }

      // Priority 2: Historical scan data (if we have a hash match)
      if (proc.hash) {
        const historyMatch = historyMap.get(proc.hash);
        if (historyMatch) {
          // Populate metadata so we don't have to look it up again
          const historyData = {
            rating: historyMatch.rating,
            scanStatus: historyMatch.rating, // approximate status
            detections: historyMatch.detections,
            totalEngines: historyMatch.totalEngines
          };
          state.processMetadata.set(proc.pid, historyData);
          return { ...proc, ...historyData };
        }
      }

      return proc;
    });

    // Apply filters
    applyFilters();

    // Update Dashboard Stats always from full list
    updateDashboardStats();

  } catch (error) {
    console.error('Error refreshing processes:', error);
  }
}

// ===== FILTERING =====
function toggleFilter(filterValue) {
  state.activeFilters.clear();
  state.activeFilters.add(filterValue);

  // Apply filters
  applyFilters();
}

function handleSearch(e) {
  applyFilters();
}

function applyFilters() {
  const query = document.getElementById('search-input').value.toLowerCase();

  state.filteredProcesses = state.processes.filter(proc => {
    // 1. Text Search Filter
    const matchesSearch = !query ||
      (proc.name && proc.name.toLowerCase().includes(query)) ||
      (proc.path && proc.path.toLowerCase().includes(query)) ||
      (proc.pid && proc.pid.toString().includes(query));

    if (!matchesSearch) return false;

    // 2. Status/Type Filter
    if (state.activeFilters.has('all')) return true;

    const status = proc.scanStatus || 'not_scanned';

    // Map loose statuses if needed
    if (state.activeFilters.has('safe') && (status === 'safe' || status === 'whitelisted')) return true;
    if (state.activeFilters.has('suspicious') && (status === 'suspicious' || status === 'low_risk' || status === 'unknown')) return true;
    if (state.activeFilters.has('malicious') && status === 'malicious') return true;
    if (state.activeFilters.has('not_scanned') && status === 'not_scanned') return true;

    return false;
  });

  // Re-apply current sort
  const { column, direction } = state.currentSort;
  if (column) {
    state.filteredProcesses.sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  updateProcessTable();
}

function updateProcessTable() {
  const tbody = document.getElementById('process-table-body');
  const tableContainer = document.querySelector('.table-container');

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
      <td>
        <div class="process-name">${escapeHtml(proc.name)}</div>
        ${proc.hash ? '' :
      (proc.hashError ? `<div class="process-subtitle" style="color:var(--status-unknown);">${escapeHtml(proc.hashError)}</div>` :
        '<div class="process-subtitle">Calculating hash...</div>')
    }
      </td>
      <td>${proc.pid}</td>
      <td>${proc.cpu.toFixed(1)}%</td>
      <td>${proc.memMB} MB</td>
      <td title="${escapeHtml(proc.path)}">${truncatePath(proc.path)}</td>
      <td>
        <button class="table-action-btn" onclick="scanProcess(${proc.pid})" ${!proc.hash ? 'disabled style="opacity: 0.5; cursor: not-allowed;" title="Cannot scan: No file hash available"' : ''}>
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
    alert('File hash is still being calculated. Please try again in a moment.');
    return;
  }

  try {
    const result = await window.electronAPI.scanProcess(process);

    if (result.error) {
      alert(`Scan error: ${result.error}`);
      return;
    }

    if (result.status === 'queued') {
      alert(`Process added to scan queue. Position: ${result.position}`);
      return;
    }

    if (result.status === 'not_configured') {
      alert('Please configure your VirusTotal API key in Settings');
      openSettings();
      return;
    }

    // Direct result (cached or whitelisted)
    state.processMetadata.set(pid, { ...result, scanStatus: result.status });
    refreshProcesses();
    viewProcessDetails(pid);

  } catch (error) {
    console.error('Error scanning process:', error);
    alert('Failed to scan process');
  }
}

async function scanAllProcesses(onlyNew = false) {
  const confirmationMsg = onlyNew
    ? 'This will scan only processes that have not been scanned yet (and have a hash). Continue?'
    : 'This will scan ALL running processes that have calculated hashes, potentially re-scanning known files. Continue?';

  if (!confirm(confirmationMsg)) {
    return;
  }

  // Filter for processes that have a hash
  // If onlyNew is true, strictly require 'not_scanned' status (or undefined)
  // If onlyNew is false, we scan everything that has a hash, even if already scanned (re-scan)
  const processesToScan = state.processes.filter(p => {
    if (!p.hash) return false;

    if (onlyNew) {
      return !p.scanStatus || p.scanStatus === 'not_scanned';
    }

    return true;
  });

  const pendingHashCount = state.processes.filter(p => !p.hash).length;


  if (processesToScan.length === 0) {
    if (pendingHashCount > 0) {
      alert(`No processes ready to scan yet. ${pendingHashCount} processes are still calculating hashes. Please wait a moment and try again.`);
    } else {
      alert('All testable processes have already been scanned.');
    }
    return;
  }

  alert(`Queued ${processesToScan.length} processes for scanning. ${pendingHashCount > 0 ? `(Skipped ${pendingHashCount} processes pending hash calculation)` : ''}`);

  let count = 0;
  for (const proc of processesToScan) {
    window.electronAPI.scanProcess(proc);
    count++;
    if (count % 20 === 0) await new Promise(r => setTimeout(r, 100));
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
        <span class="info-value" style="word-break: break-all; font-family: monospace; font-size: 0.7rem;">${process.hash || 'Calculating...'}</span>
      </div>
    </div>
  `;

  if (process.rating || process.scanResult) {
    const result = process.scanResult || process; // Support both structures

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
        </div>

        ${process.hash ? `
        <div style="margin-top: 1rem;">
          <a href="https://www.virustotal.com/gui/file/${process.hash}" target="_blank" class="btn-primary" style="display: inline-flex; text-decoration: none;">
            View Full Report
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

// ===== QUEUE MANAGEMENT =====
async function updateScanQueue() {
  try {
    const queue = await window.electronAPI.getScanQueue();
    state.scanQueue = queue || [];
    updateQueueTable();
  } catch (error) {
    console.error('Error updating scan queue:', error);
  }
}

function updateQueueTable() {
  const tbody = document.getElementById('queue-table-body');
  if (!tbody) return;

  if (state.scanQueue.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="loading-cell">
          <p>Queue is empty</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.scanQueue.map((item, index) => `
    <tr>
      <td>${index === 0 ? '<span class="status-badge status-suspicious">Processing</span>' : '<span class="status-badge status-unknown">Queued</span>'}</td>
      <td>${escapeHtml(item.name || item.processName)}</td>
      <td style="font-family: monospace; font-size: 0.7rem;">${item.hash ? item.hash.substring(0, 16) + '...' : 'N/A'}</td>
      <td>${new Date(item.timestamp).toLocaleTimeString()}</td>
    </tr>
  `).join('');
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
  if (!tbody) return;

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
    await updateSystemStats();
  }, 5000);
}

async function updateSystemStats() {
  try {
    const stats = await window.electronAPI.getSystemStats();

    if (stats && !stats.error) {
      document.getElementById('cpu-usage').textContent = `${stats.load.currentLoad}%`;
      document.getElementById('mem-usage').textContent = `${stats.memory.usedPercent}%`;

      document.getElementById('dashboard-cpu').textContent = `${stats.load.currentLoad}%`;
      document.getElementById('dashboard-mem').textContent = `${stats.memory.used} GB / ${stats.memory.total} GB`;
    }
  } catch (err) {
    // Fallback or ignore
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
    case 'queued':
      return 'status-suspicious';
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
    case 'queued': return 'Queued';
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
