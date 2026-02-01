const Datastore = require('nedb-promises');
const path = require('path');
const { app } = require('electron');

class Database {
    constructor() {
        this.scans = null;
        this.settings = null;
        this.whitelist = null;
    }

    /**
     * Initialize databases
     */
    async initialize() {
        const userDataPath = app.getPath('userData');

        this.scans = Datastore.create({
            filename: path.join(userDataPath, 'scans.db'),
            autoload: true
        });

        this.settings = Datastore.create({
            filename: path.join(userDataPath, 'settings.db'),
            autoload: true
        });

        this.whitelist = Datastore.create({
            filename: path.join(userDataPath, 'whitelist.db'),
            autoload: true
        });

        // Create indexes
        await this.scans.ensureIndex({ fieldName: 'hash' });
        await this.scans.ensureIndex({ fieldName: 'scanDate' });
        await this.whitelist.ensureIndex({ fieldName: 'hash' });

        console.log('Database initialized');
    }

    /**
     * Cache scan result
     */
    async cacheScanResult(scanResult) {
        try {
            // Check if already exists
            const existing = await this.scans.findOne({ hash: scanResult.hash });

            if (existing) {
                // Update existing
                await this.scans.update(
                    { hash: scanResult.hash },
                    { $set: scanResult }
                );
            } else {
                // Insert new
                await this.scans.insert(scanResult);
            }

            return { success: true };
        } catch (error) {
            console.error('Error caching scan result:', error);
            throw error;
        }
    }

    /**
     * Get cached scan result
     */
    async getCachedScan(hash) {
        try {
            const result = await this.scans.findOne({ hash });

            // Check if cache is still valid (7 days)
            if (result) {
                const cacheAge = Date.now() - result.scanDate;
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

                if (cacheAge < maxAge) {
                    return result;
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting cached scan:', error);
            return null;
        }
    }

    /**
     * Get scan history
     */
    async getScanHistory(limit = 5000) {
        try {
            const history = await this.scans
                .find({})
                .sort({ scanDate: -1 })
                .limit(limit);

            return history;
        } catch (error) {
            console.error('Error getting scan history:', error);
            throw error;
        }
    }

    /**
     * Save settings
     */
    async saveSettings(newSettings) {
        try {
            const existing = await this.settings.findOne({ _id: 'app_settings' });

            if (existing) {
                await this.settings.update(
                    { _id: 'app_settings' },
                    { $set: { ...existing, ...newSettings } }
                );
            } else {
                await this.settings.insert({
                    _id: 'app_settings',
                    ...newSettings
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    }

    /**
     * Get settings
     */
    async getSettings() {
        try {
            const settings = await this.settings.findOne({ _id: 'app_settings' });

            // Return default settings if none exist
            return settings || {
                virusTotalApiKey: '',
                autoScan: false,
                scanInterval: 300000, // 5 minutes
                theme: 'dark'
            };
        } catch (error) {
            console.error('Error getting settings:', error);
            throw error;
        }
    }

    /**
     * Add to whitelist
     */
    async addToWhitelist(hash, processName = '') {
        try {
            const existing = await this.whitelist.findOne({ hash });

            if (!existing) {
                await this.whitelist.insert({
                    hash,
                    processName,
                    addedDate: Date.now()
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Error adding to whitelist:', error);
            throw error;
        }
    }

    /**
     * Remove from whitelist
     */
    async removeFromWhitelist(hash) {
        try {
            await this.whitelist.remove({ hash });
            return { success: true };
        } catch (error) {
            console.error('Error removing from whitelist:', error);
            throw error;
        }
    }

    /**
     * Check if hash is whitelisted
     */
    async isWhitelisted(hash) {
        try {
            const result = await this.whitelist.findOne({ hash });
            return result !== null;
        } catch (error) {
            console.error('Error checking whitelist:', error);
            return false;
        }
    }

    /**
     * Get whitelist
     */
    async getWhitelist() {
        try {
            return await this.whitelist.find({});
        } catch (error) {
            console.error('Error getting whitelist:', error);
            throw error;
        }
    }

    /**
     * Clear old scan cache (older than 30 days)
     */
    async clearOldCache() {
        try {
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            await this.scans.remove(
                { scanDate: { $lt: thirtyDaysAgo } },
                { multi: true }
            );
            return { success: true };
        } catch (error) {
            console.error('Error clearing old cache:', error);
            throw error;
        }
    }
}

module.exports = new Database();
