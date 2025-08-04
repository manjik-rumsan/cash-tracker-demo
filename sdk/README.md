# Cash Tracker SDK

A comprehensive TypeScript SDK for managing cash tracking operations using Account Abstraction (ERC-4337) and ERC-20 tokens.

## 🏗️ Architecture

The SDK is built around three core concepts from the demo scripts:

1. **Entity Management** - Smart account deployment and management
2. **Operations** - Token operations (balance, approval, transfer)
3. **Tracking** - Real-time monitoring of balances and allowances

## 📁 Structure

```
sdk/
├── src/
│   ├── core/
│   │   ├── CashTrackerSDK.ts          # Main SDK class
│   │   ├── ConfigManager.ts            # Configuration management
│   │   ├── ValidationUtils.ts          # Input validation
│   │   └── SDKError.ts                 # Custom error handling
│   ├── entities/
│   │   ├── EntityManager.ts            # Smart account lifecycle
│   │   ├── Entity.ts                   # Entity types and interfaces
│   │   └── SmartAccountFactory.ts      # Smart account deployment
│   ├── operations/
│   │   ├── OperationsManager.ts        # Token operations
│   │   ├── TransactionManager.ts       # Transaction handling
│   │   └── GasEstimator.ts             # Gas estimation
│   ├── tracking/
│   │   ├── TrackingManager.ts          # Real-time tracking
│   │   ├── EventManager.ts             # Event subscriptions
│   │   └── StateManager.ts             # State management
│   ├── types/
│   │   ├── index.ts                    # Type exports
│   │   ├── contracts.ts                # Contract interfaces
│   │   └── events.ts                   # Event types
│   └── utils/
│       ├── constants.ts                # SDK constants
│       ├── helpers.ts                  # Utility functions
│       └── formatters.ts               # Data formatting
├── examples/
│   ├── basic-usage.ts                  # Basic SDK usage
│   ├── multi-entity.ts                 # Multi-entity operations
│   ├── real-time-tracking.ts           # Tracking examples
│   └── advanced-operations.ts          # Advanced features
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
    ├── api.md                          # API documentation
    ├── examples.md                      # Usage examples
    └── migration.md                    # Migration guide
```

## 🚀 Quick Start

```typescript
import { CashTrackerSDK } from "./src/core/CashTrackerSDK";

const sdk = new CashTrackerSDK({
  network: "base-sepolia",
  rpcUrl: "https://sepolia.base.org",
  entryPoint: "0x1e2717BC0dcE0a6632fe1B057e948ec3EF50E38b",
  cashToken: "0xc3E3282048cB2F67b8e08447e95c37f181E00133",
});

await sdk.initialize();

// Deploy smart accounts
const entities = await sdk.entities.deployMultiple(privateKeys);

// Check balance
const balance = await sdk.operations.getBalance("entity1");

// Approve tokens
await sdk.operations.approveTokens("entity1", "entity2", amount);

// Start tracking
const session = await sdk.tracking.startTracking({
  interval: 5000,
  entities: ["entity1", "entity2"],
});
```

## 🎯 Core Features

### Entity Management

- Deploy smart accounts for multiple entities
- Load existing configurations
- Validate entity setup
- Switch between active entities

### Operations

- Check token balances
- Approve token spending
- Transfer tokens using allowances
- Gas estimation and transaction management

### Real-time Tracking

- Live balance monitoring
- Allowance tracking
- Event subscriptions
- Configurable refresh intervals

### Configuration

- Multiple config sources (file, env, object)
- Environment-specific settings
- Validation and error handling

## 📋 Implementation Plan

### Phase 1: Core Infrastructure

- [ ] SDK class structure
- [ ] Configuration management
- [ ] Error handling and validation
- [ ] Type definitions

### Phase 2: Entity Management

- [ ] Smart account deployment
- [ ] Entity lifecycle management
- [ ] Configuration persistence

### Phase 3: Operations Layer

- [ ] Token operations
- [ ] Transaction management
- [ ] Gas estimation

### Phase 4: Tracking System

- [ ] Real-time monitoring
- [ ] Event system
- [ ] State management

### Phase 5: Documentation & Examples

- [ ] API documentation
- [ ] Usage examples
- [ ] Migration guides

## 🔧 Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build SDK
npm run build

# Run examples
npm run examples
```

## 📚 Documentation

- [API Reference](./docs/api.md)
- [Usage Examples](./docs/examples.md)
- [Migration Guide](./docs/migration.md)
