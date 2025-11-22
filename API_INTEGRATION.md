# Casino API Integration Guide

This document describes how to integrate Web DiceBot with real cryptocurrency dice casino APIs.

## Supported Casinos

Web DiceBot now supports integration with the following dice casinos:

- **Stake.com** - API Key authentication
- **PrimeDice** - Username/Password or API Key authentication
- **Bitsler** - API Key authentication
- **DuckDice** - API Key authentication
- **999Dice** - Username/Password authentication

## Getting Started

### 1. Select a Casino

In the Control Panel, use the "Select Site" dropdown to choose your preferred casino. When you select a casino (other than "Simulation Mode"), an API Authentication panel will appear.

### 2. Obtain API Credentials

#### Stake.com
1. Log in to your Stake.com account
2. Go to Settings → API
3. Create a new API key
4. Copy the API key for use in Web DiceBot

#### PrimeDice
**Option A: API Key**
1. Log in to PrimeDice
2. Navigate to Settings → API
3. Generate an API key

**Option B: Username/Password**
- Use your regular PrimeDice account credentials

#### Bitsler
1. Log in to Bitsler
2. Go to Settings → API Keys
3. Create a new API key with dice betting permissions

#### DuckDice
1. Log in to DuckDice
2. Navigate to Settings → API
3. Create a new API key
4. Copy the API key for use in Web DiceBot

#### 999Dice
- Use your regular 999Dice username and password

### 3. Connect to the Casino

1. Enter your API credentials in the authentication panel
2. Click the "Connect" button
3. Wait for the connection confirmation
4. Your real balance will be fetched and displayed

## API Features

### Automatic Balance Sync
When connected to a casino API, the bot will:
- Fetch your real balance on connection
- Update balance after each bet
- Disable manual balance editing

### Real Betting
All bets placed while connected will:
- Use the casino's betting API
- Reflect real wins/losses
- Update your actual casino balance
- Record provably fair results

### Disconnect
Click the "Disconnect" button to:
- Close the API connection
- Return to simulation mode
- Re-enable manual balance editing

## API Architecture

### Casino API Module (`casino-api.js`)

The integration uses a modular architecture with:

**Base Class: `CasinoAPI`**
- Abstract interface for all casino integrations
- Methods: `authenticate()`, `placeBet()`, `getBalance()`, `disconnect()`

**Casino-Specific Classes:**
- `StakeAPI` - Implements Stake.com GraphQL API
- `PrimeDiceAPI` - Implements PrimeDice REST API
- `BitslerAPI` - Implements Bitsler REST API
- `Dice999API` - Implements 999Dice web API

**Factory Function: `createCasinoAPI(siteName)`**
- Creates appropriate API instance based on selected site

### Error Handling

The bot handles various API errors:
- Invalid credentials
- Insufficient balance
- Network timeouts
- API rate limits
- Connection failures

All errors are displayed as notifications to the user.

## Security Considerations

### API Key Storage
⚠️ **Important Security Notes:**
- API keys are stored only in browser memory
- Keys are never saved to disk or sent to third parties
- Clear your browser cache if using a shared computer
- Use API keys with minimal permissions when possible

### CORS Limitations
Due to browser security (CORS), direct API calls may be blocked by some casinos. In production, you may need:
- A backend proxy server
- Browser extensions to bypass CORS
- Casino APIs that support CORS

### Responsible Use
- Never share your API keys
- Use stop conditions to limit losses
- Test with small amounts first
- Comply with casino terms of service
- Be aware of local gambling laws

## API Rate Limits

Different casinos have different rate limits:
- **Stake.com**: ~10 requests/second
- **PrimeDice**: ~5 requests/second
- **Bitsler**: ~3 requests/second
- **999Dice**: ~2 requests/second

The bot respects these limits by using the "Bet Speed" setting.

## Troubleshooting

### Connection Failed
- Verify your API credentials are correct
- Check your internet connection
- Ensure the casino site is accessible
- Try refreshing the page

### Bet Failed
- Ensure sufficient balance
- Check if API key has betting permissions
- Verify bet amount meets casino minimums
- Check casino's service status

### Balance Not Updating
- Click "Disconnect" and reconnect
- Refresh the page
- Verify API key is still valid
- Check casino's API status

## Example Usage

### Connecting to Stake.com

```javascript
// User workflow:
// 1. Select "Stake.com" from dropdown
// 2. Enter API key: "your-api-key-here"
// 3. Click "Connect"
// 4. Bot fetches balance and enables betting
// 5. Configure strategy and click "Start Bot"
```

### Automated Betting with PrimeDice

```javascript
// User workflow:
// 1. Select "PrimeDice"
// 2. Enter username and password
// 3. Connect
// 4. Select "Martingale" strategy
// 5. Set stop conditions
// 6. Start automated betting
```

## API Response Formats

### Successful Bet Response
```json
{
    "success": true,
    "roll": 52.34,
    "won": true,
    "profit": 0.00000098,
    "payout": 0.00000198
}
```

### Failed Bet Response
```json
{
    "success": false,
    "message": "Insufficient balance"
}
```

## Future Enhancements

Planned features for future releases:
- Additional casino integrations
- WebSocket support for real-time updates
- Multi-currency support
- Backend proxy for better CORS handling
- API key encryption
- Session persistence

## Support

For API integration issues:
1. Check the browser console for detailed error messages
2. Verify API credentials with the casino directly
3. Test API access with casino's official documentation
4. Open an issue on GitHub with error details

## Disclaimer

⚠️ **Important Legal Notice:**

This software is for educational purposes only. Gambling with real money involves significant financial risk. The developers are not responsible for:
- Financial losses
- API misuse
- Violation of casino terms
- Legal issues in your jurisdiction

Always gamble responsibly and within your means.
