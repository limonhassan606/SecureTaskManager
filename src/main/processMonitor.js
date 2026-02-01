const si = require('systeminformation');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class ProcessMonitor {
    constructor() {
        this.processCache = new Map();
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
                    const enriched = {
                        pid: proc.pid,
                        name: proc.name,
                        cpu: proc.cpu || 0,
                        mem: proc.mem || 0,
                        memMB: proc.memRss ? (proc.memRss / 1024 / 1024).toFixed(2) : '0',
                        path: proc.path || '',
                        command: proc.command || '',
                        started: proc.started || '',
                        user: proc.user || '',
                        priority: proc.priority || 0,
                        threads: proc.threads || 0,
                        hash: null,
                        scanStatus: 'not_scanned'
                    };

                    // Calculate hash if path exists
                    if (enriched.path && enriched.path !== '') {
                        try {
                            const hash = await this.calculateFileHash(enriched.path);
                            enriched.hash = hash;
                        } catch (error) {
                            // File might not be accessible, skip hash
                            enriched.hash = null;
                        }
                    }

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
                    used: (mem.used / 1024 / 1024 / 1024).toFixed(2), // GB
                    free: (mem.free / 1024 / 1024 / 1024).toFixed(2), // GB
                    usedPercent: ((mem.used / mem.total) * 100).toFixed(1)
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
