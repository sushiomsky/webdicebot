# Web DiceBot 🎲

A complete web-based cryptocurrency dice betting bot inspired by [Seuntjie's DiceBot](https://bot.seuntjie.com/GettingStarted.aspx). Features automated betting strategies, real casino API integration, and simulation mode for safe testing.

![Web DiceBot Screenshot](https://github.com/user-attachments/assets/84b87dbc-f45c-446e-9cc1-ee032f99ecfc)

## Features

### 🎮 Betting Modes
- **Manual Betting** - Place single bets manually
- **Automated Betting** - Run continuous betting with strategies
- **Simulation Mode** - Safe testing without real money
- **Real Casino Integration** - Connect to Stake, PrimeDice, Bitsler, 999Dice

### 📊 Betting Strategies
- **Martingale** - Double bet after loss, reset after win
- **Fibonacci** - Follow Fibonacci sequence progression
- **D'Alembert** - Increase/decrease by fixed percentage
- **Labouchere** - Advanced sequence-based strategy
- **Custom Lua Scripts** - Write your own betting logic

### ⚙️ Configuration Options
- Adjustable base bet amount
- Win chance percentage (0.01% - 98%)
- Prediction type (Roll Over/Under)
- Real-time payout multiplier calculation
- Configurable bet speed (10ms - unlimited)

### 🛑 Stop Conditions
- Stop on profit target
- Stop on loss limit
- Stop after X bets
- Stop on win streak

### 📈 Statistics & Analytics
- Real-time balance tracking
- Win/loss statistics
- Current and longest streaks
- Luck percentage calculator
- Live profit chart visualization
- Detailed bet history (last 100 bets)

### 💾 Data Management
- Export/Import configuration
- Save and load betting strategies
- Bet history tracking

### 🔧 Advanced Features
- Emergency stop (Ctrl+Shift+S)
- Sound notifications
- Auto-scroll history
- Responsive design
- Multiple site selection

### 🔌 Casino API Integration
- **Stake.com** - API Key authentication
- **PrimeDice** - Username/Password or API Key
- **Bitsler** - API Key authentication
- **999Dice** - Username/Password authentication
- Real-time balance synchronization
- Provably fair bet verification

See [API_INTEGRATION.md](API_INTEGRATION.md) for detailed setup instructions.

## Getting Started

### Installation

Simply open `index.html` in any modern web browser. No installation or dependencies required!

```bash
# Clone the repository
git clone https://github.com/sushiomsky/webdicebot.git
cd webdicebot

# Open in browser
# Option 1: Double-click index.html
# Option 2: Use a local server
python3 -m http.server 8080
# Then visit http://localhost:8080
```

### Quick Start

#### Simulation Mode
1. **Set Your Balance** - Enter starting balance in BTC
2. **Configure Bet** - Set base bet amount and win chance
3. **Choose Strategy** - Select from predefined strategies or create custom
4. **Set Stop Conditions** - Define when to stop betting
5. **Start Bot** - Click "Start Bot" to begin automated betting

#### Real Casino Mode
1. **Select Site** - Choose a casino from the dropdown (Stake, PrimeDice, etc.)
2. **Enter Credentials** - Provide your API key or username/password
3. **Connect** - Click "Connect" to authenticate
4. **Configure & Start** - Set up your strategy and start betting with real money

⚠️ **Warning**: Real casino mode uses actual cryptocurrency. Always test strategies in simulation mode first!

### Usage Examples

#### Example 1: Conservative Martingale
```
Base Bet: 0.00000100 BTC
Win Chance: 49.50%
Strategy: Martingale
On Loss: Multiply by 2
On Win: Reset to Base
Stop on Profit: 0.01 BTC
```

#### Example 2: Custom Lua Script
```lua
-- Aggressive multiplier strategy
if win then
    nextbet = basebet
else
    if previousbet < basebet * 8 then
        nextbet = previousbet * 2.5
    else
        nextbet = basebet
    end
end
```

## Features in Detail

### Betting Configuration Panel
Configure all aspects of your betting strategy:
- **Base Bet Amount**: Starting bet size
- **Win Chance**: Probability of winning (affects payout)
- **Prediction**: Roll Over or Roll Under
- **Payout Multiplier**: Automatically calculated based on win chance

### Strategy Options

#### Martingale
Classic doubling strategy - doubles bet after each loss, resets after win. High risk, high reward.

#### Fibonacci
Uses Fibonacci sequence for bet progression. More conservative than Martingale.

#### D'Alembert
Increases bet by fixed percentage after loss, decreases after win. Balanced approach.

#### Custom Scripts
Write your own betting logic using Lua-like syntax. Available variables:
- `balance` - Current balance
- `basebet` - Base bet amount
- `previousbet` - Last bet amount
- `win` - Boolean, true if last bet won
- `loss` - Boolean, true if last bet lost
- `nextbet` - Set this to control next bet size

### Statistics Panel
Track your performance with detailed statistics:
- **Wins/Losses**: Total count
- **Current Streak**: Current winning or losing streak
- **Longest Streaks**: Record streaks
- **Luck**: Actual wins vs expected wins percentage

### Profit Chart
Visual representation of your profit/loss over time with:
- Real-time updates
- Zero line reference
- Bet count on X-axis
- Profit in BTC on Y-axis

## Keyboard Shortcuts

- **Ctrl+Shift+S** - Emergency stop (stops bot immediately)

## Safety Features

⚠️ **Important Disclaimers:**
- This is a **simulation tool** for educational purposes
- Gambling involves significant financial risk
- Always use responsibly and within your means
- No real money transactions are processed by this tool

## Browser Compatibility

Works on all modern browsers:
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Opera

## Technical Details

Built with pure web technologies:
- **HTML5** - Structure
- **CSS3** - Styling with modern grid layout
- **Vanilla JavaScript** - No dependencies
- **Canvas API** - Chart rendering
- **Web Audio API** - Sound notifications

## Screenshots

### Initial View
![Initial View](https://github.com/user-attachments/assets/84b87dbc-f45c-446e-9cc1-ee032f99ecfc)

### After Betting Session
![After Betting](https://github.com/user-attachments/assets/393d19ee-2cba-4118-8a41-611c61d89d4d)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is provided as-is for educational purposes.

## Acknowledgments

Inspired by [Seuntjie's DiceBot](https://bot.seuntjie.com/), a popular desktop dice betting bot for cryptocurrency gambling sites.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Remember:** This tool is for simulation and educational purposes only. Always gamble responsibly. 
