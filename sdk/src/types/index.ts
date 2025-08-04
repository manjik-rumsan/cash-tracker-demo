// Core SDK Types
export interface SDKConfig {
  network: {
    rpcUrl: string;
    chainId?: number;
    entryPoint: string;
  };
  contracts: {
    cashToken: string;
    smartAccountFactory?: string;
  };
  entities?: EntityConfig[];
  options?: {
    gasLimit?: number;
    gasPrice?: string;
    maxFeePerGas?: string;
    retryAttempts?: number;
    timeout?: number;
  };
  // File paths and artifacts
  paths?: {
    entitiesConfig?: string;
    smartAccountArtifact?: string;
    cashTokenArtifact?: string;
    logs?: string;
  };
  // Environment overrides
  environment?: {
    networkRpcUrl?: string;
    entryPoint?: string;
    cashTokenAddress?: string;
    gasLimit?: number;
    retryAttempts?: number;
    timeout?: number;
  };
}

export interface EntityConfig {
  privateKey: string;
  address: string;
  smartAccount: string;
}

export interface Entity {
  id: string;
  privateKey: string;
  address: string;
  smartAccount: string;
  wallet?: any; // ethers.Wallet
  smartAccountContract?: any; // ethers.Contract
}

// Operation Types
export interface TokenBalance {
  entityId: string;
  balance: bigint;
  formatted: string;
  decimals: number;
  symbol: string;
}

export interface TokenAllowance {
  ownerId: string;
  spenderId: string;
  allowance: bigint;
  formatted: string;
}

export interface TransactionResult {
  hash: string;
  status: "pending" | "confirmed" | "failed";
  receipt?: any; // TransactionReceipt
  error?: string;
  gasUsed?: bigint;
  gasPrice?: bigint;
}

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  totalCost: bigint;
}

// Tracking Types
export interface TrackingOptions {
  interval?: number; // milliseconds
  entities?: string[];
  includeBalances?: boolean;
  includeAllowances?: boolean;
  onUpdate?: (state: TrackingState) => void;
}

export interface TrackingState {
  balances: TokenBalance[];
  allowances: TokenAllowance[];
  timestamp: number;
  lastUpdate: number;
}

export interface BalanceEvent {
  entityId: string;
  previousBalance: bigint;
  newBalance: bigint;
  change: bigint;
  timestamp: number;
}

export interface AllowanceEvent {
  ownerId: string;
  spenderId: string;
  previousAllowance: bigint;
  newAllowance: bigint;
  change: bigint;
  timestamp: number;
}

// Event Types
export interface EventFilter {
  entityIds?: string[];
  eventTypes?: ("balance" | "allowance")[];
  fromTimestamp?: number;
  toTimestamp?: number;
}

export interface TrackingSession {
  id: string;
  isActive: boolean;
  startTime: number;
  options: TrackingOptions;
  stop: () => void;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback: Function) => void;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Configuration Types
export interface ConfigSource {
  type: "file" | "env" | "object";
  path?: string;
  data?: any;
}

// Error Types
export enum SDKErrorCode {
  INVALID_CONFIG = "INVALID_CONFIG",
  ENTITY_NOT_FOUND = "ENTITY_NOT_FOUND",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  TRACKING_ERROR = "TRACKING_ERROR",
}

export interface SDKError {
  code: SDKErrorCode;
  message: string;
  details?: any;
  originalError?: Error;
}

// Operation Types
export enum OperationType {
  CHECK_BALANCE = "CHECK_BALANCE",
  APPROVE_TOKENS = "APPROVE_TOKENS",
  CHECK_ALLOWANCE = "CHECK_ALLOWANCE",
  TRANSFER_FROM = "TRANSFER_FROM",
  SWITCH_ACCOUNT = "SWITCH_ACCOUNT",
}

export interface Operation {
  type: OperationType;
  params: any;
  entityId?: string;
  gasEstimate?: GasEstimate;
}

// Smart Account Types
export interface SmartAccountInfo {
  address: string;
  owner: string;
  entryPoint: string;
  deployed: boolean;
  balance?: bigint;
}

export interface SmartAccountDeploymentResult {
  smartAccount: SmartAccountInfo;
  transaction: TransactionResult;
  entity: Entity;
}
