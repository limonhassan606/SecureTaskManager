const axios = require('axios');
const database = require('./database');

class VirusTotalScanner {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://www.virustotal.com/api/v3';
        this.rateLimitDelay = 15000; // 15 seconds between requests (free tier: 4 req/min)
        this.lastRequestTime = 0;
        this.scanQueue = [];
        this.isProcessingQueue = false;
    }

    /**
     * Initialize with API key from settings
     */
    async initialize() {
        const settings = await database.getSettings();
        this.apiKey = settings?.virusTotalApiKey || null;
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
     * Wait for rate limit
     */
    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.rateLimitDelay) {
            const waitTime = this.rateLimitDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }

    /**
     * Scan a process using VirusTotal API
     */
    async scanProcess(processData) {
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

            // Wait for rate limit
            await this.waitForRateLimit();

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
