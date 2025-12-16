// Casino API Integration Module
// Provides API adapters for different dice casino platforms

class CasinoAPI {
    constructor(siteName) {
        this.siteName = siteName;
        this.apiKey = null;
        this.accessToken = null;
        this.authenticated = false;
    }

    async authenticate(credentials) {
        throw new Error('authenticate() must be implemented by subclass');
    }

    async placeBet(amount, winChance, prediction) {
        throw new Error('placeBet() must be implemented by subclass');
    }

    async getBalance() {
        throw new Error('getBalance() must be implemented by subclass');
    }

    disconnect() {
        this.authenticated = false;
        this.apiKey = null;
        this.accessToken = null;
    }
}

// Stake.com API Integration
class StakeAPI extends CasinoAPI {
    constructor() {
        super('stake');
        this.baseURL = 'https://api.stake.com';
        this.graphqlURL = 'https://stake.com/_api/graphql';
    }

    async authenticate(credentials) {
        try {
            // Stake uses API keys for authentication
            this.apiKey = credentials.apiKey;
            
            // Verify the API key by fetching user balance
            const balance = await this.getBalance();
            if (balance !== null) {
                this.authenticated = true;
                return { success: true, message: 'Connected to Stake.com' };
            }
            return { success: false, message: 'Invalid API key' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async getBalance() {
        try {
            const query = `
                query UserBalances {
                    user {
                        balances {
                            available { amount currency }
                        }
                    }
                }
            `;

            const response = await fetch(this.graphqlURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-access-token': this.apiKey
                },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.data && data.data.user && data.data.user.balances) {
                // Return BTC balance
                const btcBalance = data.data.user.balances.find(b => 
                    b.available.currency === 'btc'
                );
                return btcBalance ? parseFloat(btcBalance.available.amount) : 0;
            }
            return null;
        } catch (error) {
            console.error('Stake getBalance error:', error);
            throw error;
        }
    }

    async placeBet(amount, winChance, prediction) {
        try {
            const mutation = `
                mutation DiceBet($amount: Float!, $target: Float!, $condition: String!) {
                    diceBet(amount: $amount, target: $target, condition: $condition) {
                        id
                        result
                        payout
                        profit
                    }
                }
            `;

            const target = prediction === 'over' ? (100 - winChance) : winChance;
            const condition = prediction === 'over' ? 'above' : 'below';

            const response = await fetch(this.graphqlURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-access-token': this.apiKey
                },
                body: JSON.stringify({
                    query: mutation,
                    variables: {
                        amount: amount,
                        target: target,
                        condition: condition
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.data && data.data.diceBet) {
                const bet = data.data.diceBet;
                return {
                    success: true,
                    roll: bet.result,
                    won: bet.profit > 0,
                    profit: bet.profit,
                    payout: bet.payout
                };
            }

            return { success: false, message: 'Bet placement failed' };
        } catch (error) {
            console.error('Stake placeBet error:', error);
            return { success: false, message: error.message };
        }
    }
}

// PrimeDice removed as requested

// Bitsler API Integration
class BitslerAPI extends CasinoAPI {
    constructor() {
        super('bitsler');
        this.baseURL = 'https://www.bitsler.com/api';
    }

    async authenticate(credentials) {
        try {
            this.apiKey = credentials.apiKey;
            
            // Verify API key
            const balance = await this.getBalance();
            if (balance !== null) {
                this.authenticated = true;
                return { success: true, message: 'Connected to Bitsler' };
            }
            return { success: false, message: 'Invalid API key' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async getBalance() {
        try {
            const response = await fetch(`${this.baseURL}/balance`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.balance && data.balance.btc) {
                return parseFloat(data.balance.btc);
            }
            return null;
        } catch (error) {
            console.error('Bitsler getBalance error:', error);
            throw error;
        }
    }

    async placeBet(amount, winChance, prediction) {
        try {
            const response = await fetch(`${this.baseURL}/dice/bet`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: amount,
                    chance: winChance,
                    over: prediction === 'over',
                    currency: 'btc'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.result) {
                return {
                    success: true,
                    roll: data.result.roll,
                    won: data.result.win,
                    profit: data.result.profit,
                    payout: data.result.payout
                };
            }

            return { success: false, message: 'Bet placement failed' };
        } catch (error) {
            console.error('Bitsler placeBet error:', error);
            return { success: false, message: error.message };
        }
    }
}

// DuckDice API Integration - Complete Implementation
// Based on official DuckDice Bot API and Seuntjie's DiceBot
class DuckDiceAPI extends CasinoAPI {
    constructor() {
        super('duckdice');
        this.baseURL = 'https://duckdice.io/api';
        this.apiVersion = '1.1.1';
        this.currentSeed = null;
        this.currency = 'BTC';
        this.mode = 1; // 1 = main balance, 2 = faucet balance
    }

    async authenticate(credentials) {
        try {
            this.apiKey = credentials.apiKey;
            
            // Verify API key by fetching user balance
            const balance = await this.getBalance();
            if (balance !== null && balance !== undefined) {
                this.authenticated = true;
                
                // Fetch initial seed
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

    async placeBet(amount, winChance, prediction) {
        try {
            const isHigh = prediction === 'over';
            
            const betData = {
                amount: amount.toFixed(8),
                symbol: this.currency,
                chance: parseFloat(winChance.toFixed(2)),
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
                    newBalance: data.user ? parseFloat(data.user.balance) : null
                };
            }

            return { success: false, message: 'Bet placement failed' };
        } catch (error) {
            console.error('DuckDice placeBet error:', error);
            return { success: false, message: error.message };
        }
    }

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

    setCurrency(currency) {
        const supportedCurrencies = ['BTC', 'ETH', 'LTC', 'DOGE', 'DASH', 'BCH', 'XMR', 'XRP', 'ETC', 'BTG', 'XLM', 'ZEC', 'USDT', 'DTP'];
        if (supportedCurrencies.includes(currency.toUpperCase())) {
            this.currency = currency.toUpperCase();
            return true;
        } else {
            throw new Error(`Unsupported currency: ${currency}. Supported: ${supportedCurrencies.join(', ')}`);
        }
    }

    setMode(mode) {
        if (mode === 1 || mode === 2) {
            this.mode = mode;
            return true;
        } else {
            throw new Error('Invalid mode. Use 1 for main balance or 2 for faucet balance');
        }
    }

    disconnect() {
        super.disconnect();
        this.currentSeed = null;
    }
}

// Factory function to create appropriate API instance
function createCasinoAPI(siteName) {
    switch(siteName.toLowerCase()) {
        case 'stake':
            return new StakeAPI();
        case 'bitsler':
            return new BitslerAPI();
        case 'duckdice':
            return new DuckDiceAPI();
        case 'simulation':
            return null; // Use local simulation
        default:
            throw new Error(`Unsupported casino site: ${siteName}`);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CasinoAPI, StakeAPI, BitslerAPI, DuckDiceAPI, createCasinoAPI };
}
