# Wallet Integration Setup

## Overview
This document describes the wallet integration implementation for the Viving game, which includes:

1. **Wallet API Endpoint** (`/api/wallet`)
2. **State Management** using Jotai atoms
3. **Wallet Hook** for easy access to wallet data
4. **UI Integration** in the game page

## Features

### 1. Wallet API Endpoint
- **Route**: `GET /api/wallet`
- **Purpose**: Fetches user wallet details from the database
- **Security**: Only returns wallet address and creation date (excludes private key)
- **Authentication**: Requires valid user session

### 2. State Management (Jotai)
- **Atoms**: 
  - `userAtom`: Manages user authentication state
  - `walletAtom`: Stores wallet details
  - `loadingAtom`: Tracks loading states
  - `errorAtom`: Handles error states

### 3. Wallet Hook (`useWallet`)
- **Functions**:
  - `fetchWalletDetails()`: Retrieves wallet data from API
  - `clearWallet()`: Clears wallet state
- **State**:
  - `wallet`: Current wallet details
  - `loading`: Loading state
  - `error`: Error messages

### 4. UI Integration
- **Game Page**: Displays wallet information in top-left corner
- **Authentication Flow**: Automatically fetches wallet after login/signup

## Implementation Details

### Database Schema
```sql
user_wallet {
  id: number
  uid: string (user ID)
  address: string (wallet address)
  pk: string (private key - stored securely)
  created_at: string
}
```

### API Response Format
```json
{
  "success": true,
  "wallet": {
    "address": "0x...",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Usage Example
```typescript
import { useWallet } from '../lib/hooks/useWallet';

function MyComponent() {
  const { wallet, loading, error, fetchWalletDetails } = useWallet();
  
  useEffect(() => {
    fetchWalletDetails();
  }, []);
  
  if (loading) return <div>Loading wallet...</div>;
  if (error) return <div>Error: {error}</div>;
  if (wallet) return <div>Wallet: {wallet.address}</div>;
}
```

## Security Considerations

1. **Private Key Protection**: Private keys are never exposed to the frontend
2. **Authentication Required**: All wallet operations require valid user session
3. **Database Security**: Private keys are stored encrypted in the database
4. **API Security**: Wallet endpoint validates user authentication

## Future Enhancements

1. **Wallet Balance**: Add balance checking functionality
2. **Transaction History**: Track and display transaction history
3. **Multiple Networks**: Support for different blockchain networks
4. **Wallet Recovery**: Implement wallet recovery mechanisms 