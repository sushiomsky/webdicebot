// Web DiceBot - Main Script

class DiceBot {
    constructor() {
        this.isRunning = false;
        this.balance = 1.0;
        this.startingBalance = 1.0;
        this.currentBet = 0.000001;
        this.baseBet = 0.000001;
        this.totalBets = 0;
        this.wins = 0;
        this.losses = 0;
        this.currentStreak = 0;
        this.longestWinStreak = 0;
        this.longestLossStreak = 0;
        this.betHistory = [];
        this.profitHistory = [0];
        this.chart = null;
        this.betTimeout = null;
        this.lastWin = false;
        
        // Fibonacci sequence
        this.fibonacciSequence = [1, 1];
        this.fibonacciIndex = 0;
        
        // Labouchere sequence
        this.labouchereSequence = [1, 2, 3, 4];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupChart();
        this.updateDisplay();
        this.setupEmergencyStop();
    }

    setupEventListeners() {
        // Strategy selector
        document.getElementById('strategy').addEventListener('change', (e) => {
            this.handleStrategyChange(e.target.value);
        });

        // Control buttons
        document.getElementById('start-bot').addEventListener('click', () => this.startBot());
        document.getElementById('stop-bot').addEventListener('click', () => this.stopBot());
        document.getElementById('place-bet').addEventListener('click', () => this.placeSingleBet());
        document.getElementById('reset-stats').addEventListener('click', () => this.resetStats());

        // Stop condition checkboxes
        document.getElementById('stop-profit-enabled').addEventListener('change', (e) => {
            document.getElementById('stop-profit').disabled = !e.target.checked;
        });
        document.getElementById('stop-loss-enabled').addEventListener('change', (e) => {
            document.getElementById('stop-loss').disabled = !e.target.checked;
        });
        document.getElementById('stop-bets-enabled').addEventListener('change', (e) => {
            document.getElementById('stop-bets').disabled = !e.target.checked;
        });
        document.getElementById('stop-streak-enabled').addEventListener('change', (e) => {
            document.getElementById('stop-streak').disabled = !e.target.checked;
        });

        // Balance and bet inputs
        document.getElementById('balance').addEventListener('change', (e) => {
            this.balance = parseFloat(e.target.value);
            this.startingBalance = this.balance;
            this.updateDisplay();
        });

        document.getElementById('bet-amount').addEventListener('change', (e) => {
            this.baseBet = parseFloat(e.target.value);
            this.currentBet = this.baseBet;
        });

        // Win chance and payout calculation
        document.getElementById('win-chance').addEventListener('input', () => {
            this.updatePayoutMultiplier();
        });

        // Export/Import
        document.getElementById('export-config').addEventListener('click', () => this.exportConfig());
        document.getElementById('import-config').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        document.getElementById('import-file').addEventListener('change', (e) => this.importConfig(e));
    }

    handleStrategyChange(strategy) {
        const strategyConfig = document.getElementById('strategy-config');
        const customScriptConfig = document.getElementById('custom-script-config');
        
        if (strategy === 'manual') {
            strategyConfig.style.display = 'none';
            customScriptConfig.style.display = 'none';
        } else if (strategy === 'custom') {
            strategyConfig.style.display = 'none';
            customScriptConfig.style.display = 'block';
        } else {
            strategyConfig.style.display = 'block';
            customScriptConfig.style.display = 'none';
            
            // Set default values for different strategies
            switch(strategy) {
                case 'martingale':
                    document.getElementById('on-loss').value = 'multiply';
                    document.getElementById('loss-value').value = 2;
                    document.getElementById('on-win').value = 'reset';
                    break;
                case 'fibonacci':
                    document.getElementById('on-loss').value = 'multiply';
                    document.getElementById('loss-value').value = 1.618;
                    document.getElementById('on-win').value = 'multiply';
                    document.getElementById('win-value').value = 0.618;
                    break;
                case 'dalembert':
                    document.getElementById('on-loss').value = 'increase';
                    document.getElementById('loss-value').value = 10;
                    document.getElementById('on-win').value = 'increase';
                    document.getElementById('win-value').value = -10;
                    break;
            }
        }
    }

    updatePayoutMultiplier() {
        const winChance = parseFloat(document.getElementById('win-chance').value);
        const payout = (98 / winChance).toFixed(4);
        document.getElementById('payout-multiplier').textContent = payout + 'x';
    }

    setupEmergencyStop() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.stopBot();
                this.showNotification('Emergency Stop Activated!', 'warning');
            }
        });
    }

    setupChart() {
        const canvas = document.getElementById('profit-chart');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = 300;
        
        this.chart = { canvas, ctx };
        this.drawChart();
    }

    drawChart() {
        const { canvas, ctx } = this.chart;
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        if (this.profitHistory.length < 2) {
            ctx.fillStyle = '#999';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No data to display', width / 2, height / 2);
            return;
        }
        
        // Calculate ranges
        const maxProfit = Math.max(...this.profitHistory, 0);
        const minProfit = Math.min(...this.profitHistory, 0);
        const range = maxProfit - minProfit || 1;
        
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        // Draw axes
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // Draw zero line
        const zeroY = padding + chartHeight * (maxProfit / range);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, zeroY);
        ctx.lineTo(width - padding, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw profit line
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const step = chartWidth / (this.profitHistory.length - 1);
        
        this.profitHistory.forEach((profit, i) => {
            const x = padding + i * step;
            const y = padding + chartHeight * (1 - (profit - minProfit) / range);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw labels
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(maxProfit.toFixed(8), padding - 5, padding + 15);
        ctx.fillText('0', padding - 5, zeroY + 5);
        ctx.fillText(minProfit.toFixed(8), padding - 5, height - padding + 5);
        
        ctx.textAlign = 'center';
        ctx.fillText('Bets: ' + this.totalBets, width / 2, height - 10);
    }

    rollDice() {
        return Math.random() * 100;
    }

    checkWin(roll, winChance, prediction) {
        if (prediction === 'over') {
            return roll > (100 - winChance);
        } else {
            return roll < winChance;
        }
    }

    calculateNextBet(won) {
        const strategy = document.getElementById('strategy').value;
        
        if (strategy === 'manual') {
            return this.baseBet;
        }
        
        if (strategy === 'custom') {
            return this.executeCustomScript(won);
        }
        
        const onWin = document.getElementById('on-win').value;
        const onLoss = document.getElementById('on-loss').value;
        const winValue = parseFloat(document.getElementById('win-value').value);
        const lossValue = parseFloat(document.getElementById('loss-value').value);
        
        let nextBet = this.currentBet;
        
        if (won) {
            switch(onWin) {
                case 'reset':
                    nextBet = this.baseBet;
                    break;
                case 'increase':
                    nextBet = this.currentBet * (1 + winValue / 100);
                    break;
                case 'multiply':
                    nextBet = this.currentBet * winValue;
                    break;
            }
        } else {
            switch(onLoss) {
                case 'reset':
                    nextBet = this.baseBet;
                    break;
                case 'increase':
                    nextBet = this.currentBet * (1 + lossValue / 100);
                    break;
                case 'multiply':
                    nextBet = this.currentBet * lossValue;
                    break;
            }
        }
        
        // Ensure bet doesn't exceed balance
        return Math.min(nextBet, this.balance);
    }

    executeCustomScript(won) {
        try {
            const script = document.getElementById('lua-script').value;
            
            // Simple Lua-like script interpreter
            // This is a simplified version - real Lua would need a proper interpreter
            const variables = {
                balance: this.balance,
                basebet: this.baseBet,
                previousbet: this.currentBet,
                win: won,
                loss: !won,
                nextbet: this.baseBet
            };
            
            // Parse simple if-then-else statements
            const lines = script.split('\n');
            let nextBet = this.baseBet;
            
            for (let line of lines) {
                line = line.trim();
                if (line.startsWith('--') || line === '') continue;
                
                // Simple assignment parsing
                if (line.includes('nextbet')) {
                    const match = line.match(/nextbet\s*=\s*(.+)/);
                    if (match) {
                        let expression = match[1].trim();
                        // Replace variables
                        for (let [key, value] of Object.entries(variables)) {
                            expression = expression.replace(new RegExp(key, 'g'), value);
                        }
                        // Evaluate
                        try {
                            nextBet = eval(expression);
                        } catch (e) {
                            console.error('Script evaluation error:', e);
                        }
                    }
                }
            }
            
            return Math.min(nextBet, this.balance);
        } catch (error) {
            console.error('Custom script error:', error);
            return this.baseBet;
        }
    }

    async placeBet() {
        if (this.currentBet > this.balance) {
            this.showNotification('Insufficient balance!', 'error');
            this.stopBot();
            return;
        }

        const winChance = parseFloat(document.getElementById('win-chance').value);
        const prediction = document.getElementById('prediction').value;
        const payout = 98 / winChance;

        const roll = this.rollDice();
        const won = this.checkWin(roll, winChance, prediction);
        
        let profit;
        if (won) {
            profit = this.currentBet * (payout - 1);
            this.balance += profit;
            this.wins++;
            this.currentStreak = this.lastWin ? this.currentStreak + 1 : 1;
            this.longestWinStreak = Math.max(this.longestWinStreak, this.currentStreak);
        } else {
            profit = -this.currentBet;
            this.balance += profit;
            this.losses++;
            this.currentStreak = !this.lastWin ? this.currentStreak - 1 : -1;
            this.longestLossStreak = Math.max(this.longestLossStreak, Math.abs(this.currentStreak));
        }
        
        this.lastWin = won;
        this.totalBets++;
        
        // Add to history
        this.betHistory.unshift({
            id: this.totalBets,
            won: won,
            bet: this.currentBet,
            roll: roll.toFixed(2),
            target: prediction === 'over' ? '>' + (100 - winChance).toFixed(2) : '<' + winChance.toFixed(2),
            profit: profit,
            balance: this.balance
        });
        
        // Keep only last 100
        if (this.betHistory.length > 100) {
            this.betHistory.pop();
        }
        
        // Update profit history
        const totalProfit = this.balance - this.startingBalance;
        this.profitHistory.push(totalProfit);
        if (this.profitHistory.length > 200) {
            this.profitHistory.shift();
        }
        
        // Calculate next bet
        this.currentBet = this.calculateNextBet(won);
        
        // Update display
        this.updateDisplay();
        this.updateBetHistory();
        this.drawChart();
        
        // Play sound
        if (document.getElementById('sound-enabled').checked) {
            this.playSound(won);
        }
        
        // Check stop conditions
        return this.checkStopConditions();
    }

    checkStopConditions() {
        const totalProfit = this.balance - this.startingBalance;
        
        // Check profit target
        if (document.getElementById('stop-profit-enabled').checked) {
            const target = parseFloat(document.getElementById('stop-profit').value);
            if (totalProfit >= target) {
                this.showNotification(`Profit target reached: ${totalProfit.toFixed(8)} BTC`, 'success');
                return false;
            }
        }
        
        // Check loss limit
        if (document.getElementById('stop-loss-enabled').checked) {
            const limit = parseFloat(document.getElementById('stop-loss').value);
            if (totalProfit <= -limit) {
                this.showNotification(`Loss limit reached: ${totalProfit.toFixed(8)} BTC`, 'error');
                return false;
            }
        }
        
        // Check bet count
        if (document.getElementById('stop-bets-enabled').checked) {
            const maxBets = parseInt(document.getElementById('stop-bets').value);
            if (this.totalBets >= maxBets) {
                this.showNotification(`Bet limit reached: ${this.totalBets} bets`, 'success');
                return false;
            }
        }
        
        // Check win streak
        if (document.getElementById('stop-streak-enabled').checked) {
            const streakLimit = parseInt(document.getElementById('stop-streak').value);
            if (this.currentStreak >= streakLimit) {
                this.showNotification(`Win streak reached: ${this.currentStreak}`, 'success');
                return false;
            }
        }
        
        return true;
    }

    async startBot() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        document.getElementById('start-bot').disabled = true;
        document.getElementById('stop-bot').disabled = false;
        document.getElementById('start-bot').classList.add('betting-active');
        
        this.runBot();
    }

    async runBot() {
        if (!this.isRunning) return;
        
        const shouldContinue = await this.placeBet();
        
        if (shouldContinue && this.isRunning) {
            const speed = parseInt(document.getElementById('bet-speed').value);
            this.betTimeout = setTimeout(() => this.runBot(), speed);
        } else {
            this.stopBot();
        }
    }

    stopBot() {
        this.isRunning = false;
        if (this.betTimeout) {
            clearTimeout(this.betTimeout);
        }
        document.getElementById('start-bot').disabled = false;
        document.getElementById('stop-bot').disabled = true;
        document.getElementById('start-bot').classList.remove('betting-active');
    }

    async placeSingleBet() {
        if (this.isRunning) {
            this.showNotification('Stop the bot before placing manual bets', 'warning');
            return;
        }
        await this.placeBet();
    }

    resetStats() {
        if (this.isRunning) {
            this.showNotification('Stop the bot before resetting', 'warning');
            return;
        }
        
        if (confirm('Are you sure you want to reset all statistics?')) {
            this.balance = parseFloat(document.getElementById('balance').value);
            this.startingBalance = this.balance;
            this.currentBet = this.baseBet;
            this.totalBets = 0;
            this.wins = 0;
            this.losses = 0;
            this.currentStreak = 0;
            this.longestWinStreak = 0;
            this.longestLossStreak = 0;
            this.betHistory = [];
            this.profitHistory = [0];
            this.lastWin = false;
            
            this.updateDisplay();
            this.updateBetHistory();
            this.drawChart();
            
            this.showNotification('Statistics reset', 'success');
        }
    }

    updateDisplay() {
        document.getElementById('current-balance').textContent = this.balance.toFixed(8) + ' BTC';
        
        const totalProfit = this.balance - this.startingBalance;
        const profitElement = document.getElementById('total-profit');
        profitElement.textContent = totalProfit.toFixed(8) + ' BTC';
        profitElement.className = 'value ' + (totalProfit >= 0 ? 'profit-positive' : 'profit-negative');
        
        document.getElementById('total-bets').textContent = this.totalBets;
        
        const winRate = this.totalBets > 0 ? (this.wins / this.totalBets * 100) : 0;
        document.getElementById('win-rate').textContent = winRate.toFixed(2) + '%';
        
        // Update statistics
        document.getElementById('stat-wins').textContent = this.wins;
        document.getElementById('stat-losses').textContent = this.losses;
        document.getElementById('stat-streak').textContent = this.currentStreak;
        document.getElementById('stat-longest-win').textContent = this.longestWinStreak;
        document.getElementById('stat-longest-loss').textContent = this.longestLossStreak;
        
        const expectedWins = this.totalBets * (parseFloat(document.getElementById('win-chance').value) / 100);
        const luck = this.totalBets > 0 ? (this.wins / expectedWins * 100) : 100;
        document.getElementById('stat-luck').textContent = luck.toFixed(2) + '%';
    }

    updateBetHistory() {
        const tbody = document.getElementById('bet-history-body');
        
        if (this.betHistory.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No bets placed yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        this.betHistory.forEach(bet => {
            const row = document.createElement('tr');
            row.className = bet.won ? 'bet-win' : 'bet-loss';
            row.innerHTML = `
                <td>${bet.id}</td>
                <td>${bet.won ? '✓ Win' : '✗ Loss'}</td>
                <td>${bet.bet.toFixed(8)}</td>
                <td>${bet.roll}</td>
                <td>${bet.target}</td>
                <td class="${bet.profit >= 0 ? 'profit-positive' : 'profit-negative'}">${bet.profit.toFixed(8)}</td>
                <td>${bet.balance.toFixed(8)}</td>
            `;
            tbody.appendChild(row);
        });
        
        // Auto-scroll if enabled
        if (document.getElementById('auto-scroll').checked) {
            const table = document.querySelector('.table-container');
            table.scrollTop = 0;
        }
    }

    playSound(won) {
        // Create a simple beep using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = won ? 800 : 400;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ffc107'};
            color: ${type === 'warning' ? '#333' : 'white'};
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 600;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    exportConfig() {
        const config = {
            balance: document.getElementById('balance').value,
            betAmount: document.getElementById('bet-amount').value,
            winChance: document.getElementById('win-chance').value,
            prediction: document.getElementById('prediction').value,
            strategy: document.getElementById('strategy').value,
            onLoss: document.getElementById('on-loss').value,
            lossValue: document.getElementById('loss-value').value,
            onWin: document.getElementById('on-win').value,
            winValue: document.getElementById('win-value').value,
            luaScript: document.getElementById('lua-script').value,
            stopProfitEnabled: document.getElementById('stop-profit-enabled').checked,
            stopProfit: document.getElementById('stop-profit').value,
            stopLossEnabled: document.getElementById('stop-loss-enabled').checked,
            stopLoss: document.getElementById('stop-loss').value,
            stopBetsEnabled: document.getElementById('stop-bets-enabled').checked,
            stopBets: document.getElementById('stop-bets').value,
            stopStreakEnabled: document.getElementById('stop-streak-enabled').checked,
            stopStreak: document.getElementById('stop-streak').value,
            betSpeed: document.getElementById('bet-speed').value,
            soundEnabled: document.getElementById('sound-enabled').checked,
            autoScroll: document.getElementById('auto-scroll').checked
        };
        
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dicebot-config.json';
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Configuration exported', 'success');
    }

    importConfig(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                
                document.getElementById('balance').value = config.balance;
                document.getElementById('bet-amount').value = config.betAmount;
                document.getElementById('win-chance').value = config.winChance;
                document.getElementById('prediction').value = config.prediction;
                document.getElementById('strategy').value = config.strategy;
                document.getElementById('on-loss').value = config.onLoss;
                document.getElementById('loss-value').value = config.lossValue;
                document.getElementById('on-win').value = config.onWin;
                document.getElementById('win-value').value = config.winValue;
                document.getElementById('lua-script').value = config.luaScript || '';
                document.getElementById('stop-profit-enabled').checked = config.stopProfitEnabled;
                document.getElementById('stop-profit').value = config.stopProfit;
                document.getElementById('stop-loss-enabled').checked = config.stopLossEnabled;
                document.getElementById('stop-loss').value = config.stopLoss;
                document.getElementById('stop-bets-enabled').checked = config.stopBetsEnabled;
                document.getElementById('stop-bets').value = config.stopBets;
                document.getElementById('stop-streak-enabled').checked = config.stopStreakEnabled;
                document.getElementById('stop-streak').value = config.stopStreak;
                document.getElementById('bet-speed').value = config.betSpeed;
                document.getElementById('sound-enabled').checked = config.soundEnabled;
                document.getElementById('auto-scroll').checked = config.autoScroll;
                
                // Trigger change events
                document.getElementById('balance').dispatchEvent(new Event('change'));
                document.getElementById('bet-amount').dispatchEvent(new Event('change'));
                document.getElementById('strategy').dispatchEvent(new Event('change'));
                this.updatePayoutMultiplier();
                
                this.showNotification('Configuration imported', 'success');
            } catch (error) {
                this.showNotification('Error importing configuration', 'error');
                console.error(error);
            }
        };
        reader.readAsText(file);
    }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the bot when the page loads
let bot;
document.addEventListener('DOMContentLoaded', () => {
    bot = new DiceBot();
});
