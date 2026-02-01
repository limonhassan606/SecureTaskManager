const si = require('systeminformation');
const crypto = require('crypto');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class ProcessMonitor {
    constructor() {
        this.processCache = new Map();

        // Cache for file hashes: path -> { hash, mtime }
        this.hashCache = new Map();

        // Queue for processes needing hash calculation
        this.hashQueue = [];
        this.isProcessingHashes = false;

        // Start background processor
        this.startHashProcessor();
    }

    /**
     * Start the background hash processor
     */
    startHashProcessor() {
        setInterval(async () => {
            if (this.hashQueue.length > 0 && !this.isProcessingHashes) {
                this.isProcessingHashes = true;
                const batchSize = 1; // Process one file at a time to prevent lag

                try {
                    const item = this.hashQueue.shift();
                    if (item && item.path) {
                        await this.updateFileHash(item.path);
                    }
                } catch (error) {
                    // Ignore errors in background process
                } finally {
                    this.isProcessingHashes = false;
                }
            }
        }, 100); // Check every 100ms
    }

    /**
     * Update hash for a specific file path
     */
    async updateFileHash(filePath) {
        try {
            // Check if file exists and get stats
            const stats = await fs.stat(filePath);
            const mtime = stats.mtimeMs;

            // Check if we already have a valid cache
            const cached = this.hashCache.get(filePath);
            if (cached && cached.mtime === mtime) {
                return cached.hash;
            }

            // Calculate new hash
            const hash = await this.calculateFileHash(filePath);

            if (hash) {
                this.hashCache.set(filePath, {
                    hash,
                    mtime
                });
            }

            return hash;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get list of all running processes with detailed information
     */
    async getProcessList() {
        try {
            const processes = await si.processes();
            const enrichedProcesses = [];

            for (const proc of processes.list) {
                try {
                    // Try to get hash from cache (instant)
                    let hash = null;
                    if (proc.path && proc.path !== '') {
                        const cached = this.hashCache.get(proc.path);
                        if (cached) {
                            hash = cached.hash;
                        } else {
                            // Verify path isn't already in queue and not recently failed
                            const isInQueue = this.hashQueue.some(item => item.path === proc.path);
                            if (!isInQueue) {
                                this.hashQueue.push({ path: proc.path });
                            }
                        }
                    }

                    const enriched = {
                        pid: proc.pid,
                        name: proc.name,
                        cpu: proc.cpu || 0,
                        mem: proc.mem || 0,
                        // Fix memory calculation to be more accurate
                        memMB: (proc.mem || 0) > 0 ? ((proc.mem || 0) / 1024 / 1024).toFixed(2) : '0',
                        path: proc.path || '',
                        command: proc.command || '',
                        started: proc.started || '',
                        user: proc.user || '',
                        priority: proc.priority || 0,
                        threads: proc.threads || 0,
                        hash: hash,
                        hashError: (this.hashCache.get(proc.path) || {}).error,
                        // If we have a hash, we can potentially look up scan status in DB later/elsewhere
                        // For now, keep as 'not_scanned' or let the frontend/controller merge with DB results
                        scanStatus: 'not_scanned'
                    };

                    enrichedProcesses.push(enriched);
                } catch (error) {
                    // Skip processes that cause errors
                    continue;
                }
            }

            return {
                processes: enrichedProcesses,
                count: enrichedProcesses.length,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error getting process list:', error);
            throw error;
        }
    }

    /**
     * Calculate SHA-256 hash of a file
     */
    async calculateFileHash(filePath) {
        try {
            // Check if file exists and is accessible
            await fs.access(filePath);

            const fileBuffer = await fs.readFile(filePath);
            const hashSum = crypto.createHash('sha256');
            hashSum.update(fileBuffer);
            return hashSum.digest('hex');
        } catch (error) {
            // File not accessible (system files, permission issues, etc.)
            return null;
        }
    }

    /**
     * Update hash for a specific file path
     */
    async updateFileHash(filePath) {
        try {
            // Check if file exists and get stats
            const stats = await fs.stat(filePath);
            const mtime = stats.mtimeMs;

            // Check if we already have a valid cache
            const cached = this.hashCache.get(filePath);
            if (cached && cached.mtime === mtime) {
                // If it was an error before, we might want to retry? 
                // For now, assume if it was Access Denied it stays Access Denied unless mtime changes (unlikely for locked files)
                return cached.hash;
            }

            // Calculate new hash
            const hash = await this.calculateFileHash(filePath);

            // Cache result, EVEN IF NULL (to prevent infinite loops)
            this.hashCache.set(filePath, {
                hash,
                mtime,
                error: !hash ? 'Access Denied' : null
            });

            return hash;
        } catch (error) {
            // Stat failed (file gone?)
            this.hashCache.set(filePath, {
                hash: null,
                mtime: 0,
                error: 'File Not Found'
            });
            return null;
        }
    }

    /**
     * Kill a process by PID
     */
    async killProcess(pid) {
        try {
            const isWindows = process.platform === 'win32';

            if (isWindows) {
                const { exec } = require('child_process');
                const util = require('util');
                const execPromise = util.promisify(exec);

                await execPromise(`taskkill /F /PID ${pid}`);
                return { success: true, message: `Process ${pid} terminated successfully` };
            } else {
                // Unix-like systems
                process.kill(pid, 'SIGTERM');
                return { success: true, message: `Process ${pid} terminated successfully` };
            }
        } catch (error) {
            console.error('Error killing process:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get system statistics
     */
    async getSystemStats() {
        try {
            const [cpu, mem, currentLoad] = await Promise.all([
                si.cpu(),
                si.mem(),
                si.currentLoad()
            ]);

            return {
                cpu: {
                    manufacturer: cpu.manufacturer,
                    brand: cpu.brand,
                    cores: cpu.cores,
                    speed: cpu.speed
                },
                memory: {
                    total: (mem.total / 1024 / 1024 / 1024).toFixed(2), // GB
                    // Use active memory if available, otherwise used. Active is more accurate for "App usage"
                    used: ((mem.active || mem.used) / 1024 / 1024 / 1024).toFixed(2), // GB
                    free: (mem.free / 1024 / 1024 / 1024).toFixed(2), // GB
                    usedPercent: (((mem.active || mem.used) / mem.total) * 100).toFixed(1)
                },
                load: {
                    currentLoad: currentLoad.currentLoad.toFixed(1),
                    avgLoad: currentLoad.avgLoad
                }
            };
        } catch (error) {
            console.error('Error getting system stats:', error);
            throw error;
        }
    }
}

module.exports = new ProcessMonitor();
