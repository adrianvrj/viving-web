# Viving Web Application Documentation

A Next.js-based web application for the Viving game, featuring blockchain integration with Starknet contracts and Cavos Services for seamless wallet management and transaction execution.

## Overview

The Viving web application is a full-stack game that combines traditional web gaming mechanics with blockchain technology. Players can create accounts, manage their game characters (Vivi), and interact with smart contracts on Starknet through a secure and user-friendly interface.

## Key Features

- **Blockchain Integration**: Seamless interaction with Starknet smart contracts
- **Cavos Services Integration**: Secure wallet management and transaction execution
- **Real-time Gameplay**: Interactive 2D game with character movement and combat
- **User Authentication**: Supabase-powered authentication system
- **State Management**: Jotai-based global state management
- **Responsive Design**: Modern UI with Tailwind CSS

## Architecture

### Tech Stack

- **Frontend**: Next.js 15.3.4, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: Jotai
- **Authentication**: Supabase
- **Blockchain**: Starknet.js
- **External Services**: Cavos Services API

### Project Structure

```
viving-web/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── external/      # Cavos Services integration
│   │   ├── vivi/          # Vivi contract interactions
│   │   └── wallet/        # Wallet management
│   ├── abis/              # Smart contract ABIs
│   │   ├── Vivi.ts        # Vivi contract ABI
│   │   └── ViviFactory.ts # Factory contract ABI
│   ├── game/              # Game page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── lib/                   # Utility functions and state
│   ├── atoms.ts           # Jotai state atoms
│   └── utils.ts           # Utility functions
├── public/                # Static assets
│   ├── fonts/             # Custom fonts
│   └── images/            # Game assets
└── package.json           # Dependencies and scripts
```

## Cavos Services Integration

### Overview

The application leverages **Cavos Services** for secure blockchain interactions, eliminating the need for users to manage private keys directly in the browser. This provides a seamless and secure experience for blockchain transactions.

### Key Benefits

1. **Enhanced Security**: Private keys are never exposed to the frontend
2. **Simplified UX**: Users don't need to install or configure wallets
3. **Cross-platform**: Works on any device without wallet extensions
4. **Transaction Management**: Automated transaction signing and execution

### Implementation

#### External Call Execution

The application uses Cavos Services for executing smart contract calls:

```typescript
// lib/utils.ts
export async function executeExternalCall({
  network,
  calls,
  address,
  hashedPk,
}: ExecuteExternalCallParams) {
  const response = await fetch('https://services.cavos.xyz/api/v1/external/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.CAVOS_API_KEY || '',
    },
    body: JSON.stringify({
      network,
      calls,
      address,
      hashedPk,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`External call failed: ${error}`);
  }

  return response.json();
}
```

#### API Endpoint

The `/api/external` endpoint acts as a proxy to Cavos Services:

```typescript
// app/api/external/route.ts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { network, calls, address, hashedPk } = body;

    if (!network || !calls || !address || !hashedPk) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await executeExternalCall({ network, calls, address, hashedPk });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
```

### Use Cases

1. **Character Creation**: Deploying new Vivi contracts through the factory
2. **Game Progression**: Updating character state (health, room progression)
3. **State Synchronization**: Reading character data from the blockchain
4. **Transaction Management**: Handling all blockchain interactions securely

## API Endpoints

### Authentication (`/api/auth`)

Handles user registration and login with Supabase integration.

**POST** `/api/auth`
- **Purpose**: User authentication (login/signup)
- **Body**: `{ email, password, mode }`
- **Response**: `{ success, wallet, user }`

### External Calls (`/api/external`)

Proxy endpoint for Cavos Services integration.

**POST** `/api/external`
- **Purpose**: Execute blockchain transactions via Cavos Services
- **Body**: `{ network, calls, address, hashedPk }`
- **Response**: Transaction result from Cavos Services

### Vivi Management (`/api/vivi`)

Manages Vivi character state and blockchain interactions.

**GET** `/api/vivi?uid={userId}`
- **Purpose**: Retrieve Vivi character state
- **Response**: `{ success, vivi }`

**POST** `/api/vivi`
- **Purpose**: Update Vivi character state
- **Body**: `{ uid, damage, heal }`
- **Response**: `{ success, transaction }`

### Wallet Management (`/api/wallet`)

Handles wallet-related operations.

**GET** `/api/wallet`
- **Purpose**: Retrieve user wallet information
- **Response**: `{ success, wallet }`

## State Management

### Jotai Atoms

The application uses Jotai for global state management:

```typescript
// lib/atoms.ts
export interface WalletInfo {
  address: string;
  pk: string;
  vivi: string;
}

export interface ViviState {
  healthPoints: number;
  room: number;
  owner: string;
  contractAddress: string;
}

// Persistent wallet state
export const walletAtom = atomWithStorage<WalletInfo | null>('wallet', null);

// Vivi game state
export const viviStateAtom = atom<ViviState | null>(null);
```

### State Flow

1. **Authentication**: User logs in → Wallet created/retrieved → State stored
2. **Game Initialization**: Vivi state loaded from blockchain → Game state updated
3. **Gameplay**: Local state changes → Blockchain updates via Cavos Services
4. **Persistence**: State synchronized between local storage and blockchain

## Game Mechanics

### Core Gameplay

- **Character Movement**: WASD controls for 2D movement
- **Combat System**: Spacebar for attacking enemies
- **Health Management**: Damage and healing mechanics
- **Room Progression**: Advancing through rooms with increasing difficulty
- **Enemy AI**: Enemies follow and attack the player

### Blockchain Integration

- **Character Ownership**: Each Vivi character is owned by a specific wallet
- **State Persistence**: Game state stored on Starknet blockchain
- **Progression Tracking**: Room advancement and health changes recorded on-chain
- **Secure Transactions**: All blockchain interactions via Cavos Services

## Smart Contract Integration

### Contract ABIs

The application includes TypeScript ABIs for both contracts:

- **Vivi Contract**: Character state management
- **ViviFactory Contract**: Character creation and deployment

### Contract Interactions

```typescript
// Example: Creating a new Vivi character
const createViviCall = {
  contractAddress: factoryAddress,
  entrypoint: 'create_vivi',
  calldata: [userAddress]
};

// Example: Progressing to next room
const nextRoomCall = {
  contractAddress: viviAddress,
  entrypoint: 'next_room',
  calldata: [damage.toString(), heal.toString()]
};
```

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Cavos Services API key

### Environment Variables

Create a `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Cavos Services
CAVOS_API_KEY=your_cavos_api_key

# Starknet Configuration
NEXT_PUBLIC_STARKNET_NETWORK=testnet
NEXT_PUBLIC_VIVI_FACTORY_ADDRESS=your_factory_address
NEXT_PUBLIC_VIVI_CLASS_HASH=your_vivi_class_hash
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Security Considerations

### Cavos Services Security

1. **Private Key Protection**: Private keys never leave Cavos Services
2. **API Key Management**: Secure storage of Cavos API keys
3. **Request Validation**: All external calls validated server-side
4. **Error Handling**: Graceful handling of transaction failures

### Application Security

1. **Authentication**: Supabase-powered user authentication
2. **Input Validation**: Server-side validation of all inputs
3. **CORS Protection**: Proper CORS configuration
4. **Environment Variables**: Secure management of sensitive data

## Deployment

### Vercel Deployment

1. Connect repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main branch

### Environment Setup

Ensure all required environment variables are configured in your deployment platform:

- Supabase credentials
- Cavos Services API key
- Starknet network configuration
- Contract addresses and class hashes

## Troubleshooting

### Common Issues

1. **Cavos Services Errors**: Check API key and network configuration
2. **Authentication Issues**: Verify Supabase credentials
3. **Transaction Failures**: Ensure sufficient gas and correct parameters
4. **State Synchronization**: Check blockchain network connectivity

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` and checking browser console for detailed error messages.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Check the documentation
- Review the Cavos Services documentation
- Open an issue on GitHub
