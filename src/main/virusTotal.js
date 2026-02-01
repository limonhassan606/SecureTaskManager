const axios = require('axios');
const database = require('./database');
const { BrowserWindow } = require('electron');

class VirusTotalScanner {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://www.virustotal.com/api/v3';
        this.rateLimitDelay = 15000; // 15 seconds between requests (free tier: 4 req/min)
        this.lastRequestTime = 0;
        this.scanQueue = [];
        this.isProcessingQueue = false;

        // Start processing queue automatically
        this.startQueueProcessor();
    }

    /**
     * Initialize with API key from settings
     */
    async initialize() {
        const settings = await database.getSettings();
        this.apiKey = settings?.virusTotalApiKey || null;
    }

    /**
     * Start the background queue processor
     */
    startQueueProcessor() {
        setInterval(() => {
            if (this.scanQueue.length > 0 && !this.isProcessingQueue) {
                this.processQueue();
            }
        }, 1000);
    }

    /**
     * Add process to scan queue
     */
    addToQueue(processData) {
        // Check if already in queue
        if (!this.scanQueue.find(p => p.hash === processData.hash)) {
            this.scanQueue.push({
                ...processData,
                addedResult: 'queued',
                timestamp: Date.now()
            });
            this.broadcastQueueUpdate();
        }
        return { status: 'queued', position: this.scanQueue.length };
    }

    /**
     * Get current queue
     */
    getQueue() {
        return this.scanQueue;
    }

    /**
     * Remove from queue
     */
    removeFromQueue(hash) {
        this.scanQueue = this.scanQueue.filter(item => item.hash !== hash);
        this.broadcastQueueUpdate();
    }

    /**
     * Broadcast queue update to renderer
     */
    broadcastQueueUpdate() {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            windows[0].webContents.send('scan-queue-update', this.scanQueue);
        }
    }

    /**
     * Process the scan queue
     */
    async processQueue() {
        if (this.isProcessingQueue || this.scanQueue.length === 0) return;

        this.isProcessingQueue = true;

        try {
            const item = this.scanQueue[0]; // Peek

            // Check if we need to wait for rate limit
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;

            if (timeSinceLastRequest < this.rateLimitDelay) {
                // Not ready yet
                this.isProcessingQueue = false;
                return;
            }

            // Remove from queue for processing
            this.scanQueue.shift();
            this.broadcastQueueUpdate();

            // Perform scan
            const result = await this.performScan(item);

            // Broadcast result
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
                windows[0].webContents.send('scan-complete', {
                    hash: item.hash,
                    pid: item.pid,
                    result
                });
            }

        } catch (error) {
            console.error('Error processing queue item:', error);
        } finally {
            this.isProcessingQueue = false;
        }
    }

    /**
     * Set API key
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Check if API key is configured
     */
    isConfigured() {
        return this.apiKey !== null && this.apiKey !== '';
    }

    /**
     * Scan a process (DIRECT or via Queue - internal helper)
     */
    async performScan(processData) {
        try {
            if (!this.isConfigured()) {
                return {
                    error: 'VirusTotal API key not configured',
                    status: 'not_configured'
                };
            }

            if (!processData.hash) {
                return {
                    error: 'No file hash available for this process',
                    status: 'no_hash'
                };
            }

            // Check if already in whitelist
            const isWhitelisted = await database.isWhitelisted(processData.hash);
            if (isWhitelisted) {
                return {
                    status: 'whitelisted',
                    rating: 'safe',
                    message: 'Process is whitelisted'
                };
            }

            // Check cache first
            const cached = await database.getCachedScan(processData.hash);
            if (cached) {
                return {
                    ...cached,
                    status: 'cached'
                };
            }

            // Update request time
            this.lastRequestTime = Date.now();

            // Query VirusTotal
            const response = await axios.get(
                `${this.baseUrl}/files/${processData.hash}`,
                {
                    headers: {
                        'x-apikey': this.apiKey
                    }
                }
            );

            const data = response.data.data;
            const attributes = data.attributes;

            // Parse results
            const scanResult = {
                hash: processData.hash,
                processName: processData.name,
                processPath: processData.path,
                detections: attributes.last_analysis_stats.malicious || 0,
                totalEngines: Object.keys(attributes.last_analysis_results).length,
                rating: this.calculateRating(attributes.last_analysis_stats),
                lastAnalysisDate: attributes.last_analysis_date,
                vendors: this.parseVendorResults(attributes.last_analysis_results),
                behavior: this.extractBehavior(attributes),
                reputation: attributes.reputation || 0,
                tags: attributes.tags || [],
                scanDate: Date.now()
            };

            // Cache the result
            await database.cacheScanResult(scanResult);

            return scanResult;
        } catch (error) {
            if (error.response?.status === 404) {
                // File not found in VT database
                return {
                    status: 'not_found',
                    rating: 'unknown',
                    message: 'File not found in VirusTotal database',
                    hash: processData.hash
                };
            }

            console.error('VirusTotal scan error:', error.message);
            return {
                error: error.message,
                status: 'error'
            };
        }
    }

    /**
     * Public method to scan process (adds to queue if needed or returns immediately if cached)
     */
    async scanProcess(processData) {
        // Quick check for cache/whitelist to avoid queue if possible
        const isWhitelisted = await database.isWhitelisted(processData.hash);
        if (isWhitelisted) {
            return { status: 'whitelisted', rating: 'safe' };
        }

        const cached = await database.getCachedScan(processData.hash);
        if (cached) {
            return { ...cached, status: 'cached' };
        }

        // Add to queue
        return this.addToQueue(processData);
    }

    /**
     * Calculate security rating based on detection stats
     */
    calculateRating(stats) {
        const malicious = stats.malicious || 0;
        const suspicious = stats.suspicious || 0;
        const total = malicious + suspicious;

        if (total === 0) {
            return 'safe';
        } else if (total <= 3) {
            return 'low_risk';
        } else if (total <= 10) {
            return 'suspicious';
        } else {
            return 'malicious';
        }
    }

    /**
     * Parse vendor detection results
     */
    parseVendorResults(results) {
        const vendors = [];

        for (const [vendor, result] of Object.entries(results)) {
            if (result.category === 'malicious' || result.category === 'suspicious') {
                vendors.push({
                    name: vendor,
                    category: result.category,
                    result: result.result,
                    method: result.method
                });
            }
        }

        return vendors.slice(0, 10); // Return top 10 detections
    }

    /**
     * Extract behavior information
     */
    extractBehavior(attributes) {
        const behaviors = [];

        // Check for common suspicious behaviors
        if (attributes.pe_info) {
            behaviors.push('Portable Executable');
        }

        if (attributes.signature_info) {
            if (attributes.signature_info.verified === 'Signed') {
                behaviors.push('Digitally Signed');
            } else {
                behaviors.push('Not Signed');
            }
        }

        // Add tags as behaviors
        if (attributes.tags) {
            behaviors.push(...attributes.tags.slice(0, 5));
        }

        return behaviors;
    }

    /**
     * Get file report URL
     */
    getReportUrl(hash) {
        return `https://www.virustotal.com/gui/file/${hash}`;
    }
}

module.exports = new VirusTotalScanner();
