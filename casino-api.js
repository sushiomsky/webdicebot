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

// PrimeDice API Integration
class PrimeDiceAPI extends CasinoAPI {
    constructor() {
        super('primedice');
        this.baseURL = 'https://api.primedice.com/api';
    }

    async authenticate(credentials) {
        try {
            // PrimeDice can use either API key or username/password
            if (credentials.apiKey) {
                this.apiKey = credentials.apiKey;
                this.authenticated = true;
                return { success: true, message: 'Connected to PrimeDice' };
            } else if (credentials.username && credentials.password) {
                const response = await fetch(`${this.baseURL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: credentials.username,
                        password: credentials.password
                    })
                });

                const data = await response.json();
                
                if (data.access_token) {
                    this.accessToken = data.access_token;
                    this.authenticated = true;
                    return { success: true, message: 'Connected to PrimeDice' };
                }
            }
            return { success: false, message: 'Invalid credentials' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async getBalance() {
        try {
            const token = this.apiKey || this.accessToken;
            const response = await fetch(`${this.baseURL}/users/1`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.user && data.user.balance) {
                return parseFloat(data.user.balance) / 100000000; // Convert satoshis to BTC
            }
            return null;
        } catch (error) {
            console.error('PrimeDice getBalance error:', error);
            throw error;
        }
    }

    async placeBet(amount, winChance, prediction) {
        try {
            const token = this.apiKey || this.accessToken;
            const amountSatoshi = Math.floor(amount * 100000000); // Convert BTC to satoshis
            const condition = prediction === 'over' ? '>' : '<';

            const response = await fetch(`${this.baseURL}/bet`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${token}`
                },
                body: new URLSearchParams({
                    amount: amountSatoshi.toString(),
                    target: winChance.toString(),
                    condition: condition
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.bet) {
                return {
                    success: true,
                    roll: data.bet.lucky_number,
                    won: data.bet.win,
                    profit: parseFloat(data.bet.profit) / 100000000,
                    payout: data.bet.win ? parseFloat(data.bet.payout) / 100000000 : 0
                };
            }

            return { success: false, message: 'Bet placement failed' };
        } catch (error) {
            console.error('PrimeDice placeBet error:', error);
            return { success: false, message: error.message };
        }
    }
}

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

// 999Dice API Integration
class Dice999API extends CasinoAPI {
    constructor() {
        super('999dice');
        this.baseURL = 'https://www.999dice.com/api';
        this.sessionId = null;
    }

    async authenticate(credentials) {
        try {
            const response = await fetch(`${this.baseURL}/web/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: credentials.username,
                    password: credentials.password
                })
            });

            const data = await response.json();
            
            if (data.SessionId) {
                this.sessionId = data.SessionId;
                this.authenticated = true;
                return { success: true, message: 'Connected to 999Dice' };
            }
            return { success: false, message: 'Invalid credentials' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async getBalance() {
        try {
            const response = await fetch(`${this.baseURL}/web/getbalance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    SessionId: this.sessionId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.Balance !== undefined) {
                return parseFloat(data.Balance);
            }
            return null;
        } catch (error) {
            console.error('999Dice getBalance error:', error);
            throw error;
        }
    }

    async placeBet(amount, winChance, prediction) {
        try {
            const response = await fetch(`${this.baseURL}/web/bet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    SessionId: this.sessionId,
                    PayIn: amount,
                    Chance: winChance,
                    High: prediction === 'over'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.Secret !== undefined) {
                return {
                    success: true,
                    roll: data.Secret,
                    won: data.PayOut > amount,
                    profit: data.PayOut - amount,
                    payout: data.PayOut
                };
            }

            return { success: false, message: 'Bet placement failed' };
        } catch (error) {
            console.error('999Dice placeBet error:', error);
            return { success: false, message: error.message };
        }
    }

    disconnect() {
        if (this.sessionId) {
            // Logout
            fetch(`${this.baseURL}/web/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ SessionId: this.sessionId })
            }).catch(console.error);
        }
        super.disconnect();
        this.sessionId = null;
    }
}

// Factory function to create appropriate API instance
function createCasinoAPI(siteName) {
    switch(siteName.toLowerCase()) {
        case 'stake':
            return new StakeAPI();
        case 'primedice':
            return new PrimeDiceAPI();
        case 'bitsler':
            return new BitslerAPI();
        case '999dice':
            return new Dice999API();
        case 'simulation':
            return null; // Use local simulation
        default:
            throw new Error(`Unsupported casino site: ${siteName}`);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CasinoAPI, StakeAPI, PrimeDiceAPI, BitslerAPI, Dice999API, createCasinoAPI };
}
