// DuckDice API Implementation
// Standalone version for testing and direct use
// Note: A similar implementation exists in casino-api.js that extends CasinoAPI
// This standalone version is used for the test suite and can be used independently
// Based on official DuckDice Bot API documentation and Seuntjie's DiceBot implementation

class DuckDiceAPI {
    constructor() {
        this.siteName = 'duckdice';
        this.apiKey = null;
        this.authenticated = false;
        this.baseURL = 'https://duckdice.io/api';
        this.apiVersion = '1.1.1';
        this.currentSeed = null;
        this.currency = 'BTC';
        this.mode = 1; // 1 = main balance, 2 = faucet balance
    }

    /**
     * Authenticate with the DuckDice API using an API key
     * @param {Object} credentials - { apiKey: string }
     * @returns {Promise<Object>} { success: boolean, message: string }
     */
    async authenticate(credentials) {
        try {
            this.apiKey = credentials.apiKey;
            
            // Verify the API key by fetching user balance
            const balance = await this.getBalance();
            if (balance !== null && balance !== undefined) {
                this.authenticated = true;
                
                // Also fetch initial seed
                try {
                    this.currentSeed = await this.getSeed();
                } catch (e) {
                    console.warn('Could not fetch initial seed:', e);
                }
                
                return { success: true, message: 'Connected to DuckDice' };
            }
            return { success: false, message: 'Invalid API key' };
        } catch (error) {
            console.error('DuckDice authentication error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Get user balance for the current currency
     * @returns {Promise<number|null>} Balance in BTC or null on error
     */
    async getBalance() {
        try {
            const url = `${this.baseURL}/load/${this.currency}?api_key=${this.apiKey}&api_version=${this.apiVersion}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data && data.user && data.user.balances) {
                // Return main balance or faucet balance based on mode
                const balanceStr = this.mode === 2 ? 
                    data.user.balances.faucet : 
                    data.user.balances.main;
                return parseFloat(balanceStr);
            }
            return null;
        } catch (error) {
            console.error('DuckDice getBalance error:', error);
            throw error;
        }
    }

    /**
     * Get user statistics for the current currency
     * @returns {Promise<Object>} Statistics object with bets, wins, profit, volume
     */
    async getStatistics() {
        try {
            const url = `${this.baseURL}/stat/${this.currency}?api_key=${this.apiKey}&api_version=${this.apiVersion}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data) {
                return {
                    bets: data.bets || 0,
                    wins: data.wins || 0,
                    losses: (data.bets || 0) - (data.wins || 0),
                    profit: parseFloat(data.profit || '0'),
                    volume: parseFloat(data.volume || '0')
                };
            }
            return null;
        } catch (error) {
            console.error('DuckDice getStatistics error:', error);
            throw error;
        }
    }

    /**
     * Get current seed information
     * @returns {Promise<Object>} Seed object with clientSeed, serverSeedHash, nonce
     */
    async getSeed() {
        try {
            const url = `${this.baseURL}/randomize?api_key=${this.apiKey}&api_version=${this.apiVersion}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data && data.current) {
                return {
                    clientSeed: data.current.clientSeed,
                    serverSeedHash: data.current.serverSeedHash,
                    nonce: data.current.nonce
                };
            }
            return null;
        } catch (error) {
            console.error('DuckDice getSeed error:', error);
            throw error;
        }
    }

    /**
     * Randomize the client seed
     * @param {string} [customSeed] - Optional custom client seed
     * @returns {Promise<Object>} New seed information
     */
    async randomizeSeed(customSeed) {
        try {
            // Generate random client seed if not provided
            if (!customSeed) {
                const chars = '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM';
                const length = Math.floor(Math.random() * 10) + 15; // 15-25 characters
                customSeed = '';
                for (let i = 0; i < length; i++) {
                    customSeed += chars[Math.floor(Math.random() * chars.length)];
                }
            }

            const url = `${this.baseURL}/randomize/?api_key=${this.apiKey}&api_version=${this.apiVersion}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientSeed: customSeed
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data && data.current) {
                this.currentSeed = {
                    clientSeed: data.current.clientSeed,
                    serverSeedHash: data.current.serverSeedHash,
                    nonce: data.current.nonce
                };
                return this.currentSeed;
            }
            return null;
        } catch (error) {
            console.error('DuckDice randomizeSeed error:', error);
            throw error;
        }
    }

    /**
     * Place a bet on DuckDice
     * @param {number} amount - Bet amount in BTC
     * @param {number} chance - Win chance percentage (0.01 - 98)
     * @param {string} prediction - 'over' or 'under'
     * @returns {Promise<Object>} Bet result
     */
    async placeBet(amount, chance, prediction) {
        try {
            const isHigh = prediction === 'over';
            
            const betData = {
                amount: amount.toFixed(8),
                symbol: this.currency,
                chance: parseFloat(chance.toFixed(2)),
                isHigh: isHigh,
                faucet: this.mode === 2
            };

            const url = `${this.baseURL}/play?api_key=${this.apiKey}&api_version=${this.apiVersion}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(betData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                return { 
                    success: false, 
                    message: data.error 
                };
            }

            if (data.bet) {
                // Update current seed nonce
                if (this.currentSeed) {
                    this.currentSeed.nonce = data.bet.nonce + 1;
                }

                return {
                    success: true,
                    roll: data.bet.number / 100, // Convert from 0-10000 to 0-100
                    won: data.bet.result,
                    profit: parseFloat(data.bet.profit),
                    payout: data.bet.result ? parseFloat(data.bet.winAmount) : 0,
                    betAmount: parseFloat(data.bet.betAmount),
                    hash: data.bet.hash,
                    nonce: data.bet.nonce,
                    // Update balance from response
                    newBalance: data.user ? parseFloat(data.user.balance) : null
                };
            }

            return { success: false, message: 'Bet placement failed' };
        } catch (error) {
            console.error('DuckDice placeBet error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Send a tip to another user
     * @param {string} username - Username to send tip to
     * @param {number} amount - Amount in BTC
     * @returns {Promise<Object>} Result of tip operation
     */
    async sendTip(username, amount) {
        try {
            const tipData = {
                username: username,
                symbol: this.currency,
                amount: parseFloat(amount.toFixed(8))
            };

            const url = `${this.baseURL}/tip-username?api_key=${this.apiKey}&api_version=${this.apiVersion}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tipData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                return { 
                    success: false, 
                    message: data.error 
                };
            }

            return {
                success: true,
                message: `Sent ${amount} ${this.currency} to ${username}`
            };
        } catch (error) {
            console.error('DuckDice sendTip error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Get bet history (Note: endpoint may vary based on API version)
     * @param {number} limit - Number of recent bets to retrieve
     * @returns {Promise<Array>} Array of bet objects
     */
    async getBetHistory(limit = 20) {
        try {
            // Note: The exact endpoint for bet history may need to be confirmed
            const url = `${this.baseURL}/history/${this.currency}?api_key=${this.apiKey}&limit=${limit}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('DuckDice getBetHistory error:', error);
            throw error;
        }
    }

    /**
     * Disconnect from the API
     */
    disconnect() {
        this.authenticated = false;
        this.apiKey = null;
        this.currentSeed = null;
    }

    /**
     * Set the currency to use for betting
     * @param {string} currency - Currency code (BTC, ETH, LTC, etc.)
     */
    setCurrency(currency) {
        const supportedCurrencies = ['BTC', 'ETH', 'LTC', 'DOGE', 'DASH', 'BCH', 'XMR', 'XRP', 'ETC', 'BTG', 'XLM', 'ZEC', 'USDT', 'DTP'];
        if (supportedCurrencies.includes(currency.toUpperCase())) {
            this.currency = currency.toUpperCase();
        } else {
            throw new Error(`Unsupported currency: ${currency}`);
        }
    }

    /**
     * Set the betting mode
     * @param {number} mode - 1 for main balance, 2 for faucet balance
     */
    setMode(mode) {
        if (mode === 1 || mode === 2) {
            this.mode = mode;
        } else {
            throw new Error('Invalid mode. Use 1 for main balance or 2 for faucet balance');
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DuckDiceAPI;
}
