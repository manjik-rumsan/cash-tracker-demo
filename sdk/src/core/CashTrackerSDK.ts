import { ethers } from "ethers";
import {
  SDKConfig,
  Entity,
  TokenBalance,
  TokenAllowance,
  TransactionResult,
  TrackingOptions,
  TrackingSession,
  ValidationResult,
  SDKErrorCode,
} from "../types";
import { ConfigManager } from "./ConfigManager";
import { SDKError } from "./SDKError";
import { ValidationUtils } from "../utils/ValidationUtils";
// Manager imports
import { EntityManager } from "../entities/EntityManager";
import { OperationsManager } from "../operations/OperationsManager";
import { TrackingManager } from "../tracking/TrackingManager";
import { EventManager } from "../tracking/EventManager";

/**
 * Main Cash Tracker SDK class
 * Orchestrates all components for cash tracking operations
 */
export class CashTrackerSDK {
  private config: SDKConfig | null = null;
  private provider: ethers.Provider | null = null;
  private cashTokenContract: ethers.Contract | null = null;
  private isInitialized = false;

  // Managers
  public readonly configManager: ConfigManager;
  public readonly entities: EntityManager;
  public readonly operations: OperationsManager;
  public readonly tracking: TrackingManager;
  public readonly events: EventManager;

  constructor(config?: SDKConfig) {
    this.configManager = new ConfigManager();
    this.entities = new EntityManager();
    this.operations = new OperationsManager();
    this.tracking = new TrackingManager();
    this.events = new EventManager();

    if (config) {
      this.initializeWithConfig(config);
    }
  }

  /**
   * Initialize the SDK with configuration
   */
  async initialize(config?: SDKConfig): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Load configuration
      if (config) {
        this.config = await this.configManager.loadFromObject(config);
      } else if (!this.config) {
        throw SDKError.configError(
          "No configuration provided for initialization"
        );
      }

      // Apply environment overrides if provided
      if (this.config.environment) {
        this.config.network.rpcUrl =
          this.config.environment.networkRpcUrl || this.config.network.rpcUrl;
        this.config.network.entryPoint =
          this.config.environment.entryPoint || this.config.network.entryPoint;
        this.config.contracts.cashToken =
          this.config.environment.cashTokenAddress ||
          this.config.contracts.cashToken;

        if (this.config.options && this.config.environment) {
          this.config.options.gasLimit =
            this.config.environment.gasLimit || this.config.options.gasLimit;
          this.config.options.retryAttempts =
            this.config.environment.retryAttempts ||
            this.config.options.retryAttempts;
          this.config.options.timeout =
            this.config.environment.timeout || this.config.options.timeout;
        }
      }

      // Setup provider
      this.provider = new ethers.JsonRpcProvider(this.config!.network.rpcUrl);

      // Setup CashToken contract
      this.cashTokenContract = new ethers.Contract(
        this.config!.contracts.cashToken,
        this.getCashTokenABI(),
        this.provider
      );

      // Initialize managers with full configuration
      await this.entities.initialize(this.provider, this.config!);
      await this.operations.initialize(
        this.provider,
        this.cashTokenContract,
        this.config!,
        this
      );
      await this.tracking.initialize(
        this.provider,
        this.cashTokenContract,
        this.config!
      );

      this.isInitialized = true;

      // Emit initialization event
      this.events.emit({
        id: this.generateEventId(),
        type: "sdk_initialized",
        timestamp: Date.now(),
        data: { config: this.config },
      });
    } catch (error) {
      throw SDKError.fromError(error as Error, SDKErrorCode.INVALID_CONFIG);
    }
  }

  /**
   * Initialize with configuration object
   */
  private async initializeWithConfig(config: SDKConfig): Promise<void> {
    this.config = config;
    await this.initialize();
  }

  /**
   * Get current configuration
   */
  getConfig(): SDKConfig | null {
    return this.config;
  }

  /**
   * Check if SDK is initialized
   */
  isReady(): boolean {
    return (
      this.isInitialized &&
      this.provider !== null &&
      this.cashTokenContract !== null
    );
  }

  /**
   * Get provider instance
   */
  getProvider(): ethers.Provider | null {
    return this.provider;
  }

  /**
   * Get CashToken contract instance
   */
  getCashTokenContract(): ethers.Contract | null {
    return this.cashTokenContract;
  }

  /**
   * Deploy smart accounts for multiple entities
   * Based on the pattern from 0.setup-smart-account.ts
   */
  async deploySmartAccounts(privateKeys: string[]): Promise<Entity[]> {
    if (!this.isReady()) {
      throw SDKError.configError("SDK not initialized");
    }

    const entities: Entity[] = [];

    for (let i = 0; i < privateKeys.length; i++) {
      const privateKey = privateKeys[i];

      // Validate private key
      if (!ValidationUtils.validatePrivateKey(privateKey)) {
        throw SDKError.validationError(`Invalid private key at index ${i}`);
      }

      try {
        const entity = await this.entities.deploySmartAccount(privateKey);
        entities.push(entity);

        // Emit entity created event
        this.events.emit({
          id: this.generateEventId(),
          type: "entity_created",
          timestamp: Date.now(),
          entityId: entity.id,
          data: {
            address: entity.address,
            smartAccount: entity.smartAccount,
          },
        });
      } catch (error) {
        throw SDKError.transactionFailed(
          `Failed to deploy smart account for private key ${i + 1}`,
          { privateKey: privateKey.substring(0, 10) + "...", error }
        );
      }
    }

    return entities;
  }

  /**
   * Load entities from demo format
   * Based on the pattern from the demo scripts
   */
  async loadEntitiesFromDemo(filePath: string): Promise<Entity[]> {
    const config = await this.configManager.loadEntitiesFromDemoFormat(
      filePath
    );
    await this.initialize(config);

    return this.entities.loadFromConfig(config);
  }

  /**
   * Get balance for an entity
   * Based on the pattern from 1.run-account.ts
   */
  async getBalance(entityId: string): Promise<TokenBalance> {
    if (!this.isReady()) {
      throw SDKError.configError("SDK not initialized");
    }

    const entity = this.entities.getEntity(entityId);
    if (!entity) {
      throw SDKError.entityNotFound(entityId);
    }

    return this.operations.getBalance(entityId);
  }

  /**
   * Get balances for all entities
   */
  async getAllBalances(): Promise<TokenBalance[]> {
    if (!this.isReady()) {
      throw SDKError.configError("SDK not initialized");
    }

    const entities = this.entities.getAllEntities();
    const balances: TokenBalance[] = [];

    for (const entity of entities) {
      try {
        const balance = await this.operations.getBalance(entity.id);
        balances.push(balance);
      } catch (error) {
        console.warn(`Failed to get balance for entity ${entity.id}:`, error);
      }
    }

    return balances;
  }

  /**
   * Approve tokens for spending
   * Based on the pattern from 1.run-account.ts
   */
  async approveTokens(
    ownerId: string,
    spenderId: string,
    amount: bigint
  ): Promise<TransactionResult> {
    if (!this.isReady()) {
      throw SDKError.configError("SDK not initialized");
    }

    return this.operations.approveTokens(ownerId, spenderId, amount);
  }

  /**
   * Get allowance between entities
   */
  async getAllowance(
    ownerId: string,
    spenderId: string
  ): Promise<TokenAllowance> {
    if (!this.isReady()) {
      throw SDKError.configError("SDK not initialized");
    }

    return this.operations.getAllowance(ownerId, spenderId);
  }

  /**
   * Transfer tokens using transferFrom
   * Based on the pattern from 1.run-account.ts
   */
  async transferFrom(
    spenderId: string,
    fromId: string,
    toId: string,
    amount: bigint
  ): Promise<TransactionResult> {
    if (!this.isReady()) {
      throw SDKError.configError("SDK not initialized");
    }

    return this.operations.transferFrom(spenderId, fromId, toId, amount);
  }

  /**
   * Start real-time tracking
   * Based on the pattern from tracker.ts
   */
  async startTracking(options: TrackingOptions): Promise<TrackingSession> {
    if (!this.isReady()) {
      throw SDKError.configError("SDK not initialized");
    }

    return this.tracking.startTracking(options);
  }

  /**
   * Get current tracking state
   */
  async getTrackingState(): Promise<any> {
    if (!this.isReady()) {
      throw SDKError.configError("SDK not initialized");
    }

    return this.tracking.getCurrentState();
  }

  /**
   * Switch active entity
   */
  async switchEntity(entityId: string): Promise<void> {
    if (!this.isReady()) {
      throw SDKError.configError("SDK not initialized");
    }

    const entity = this.entities.getEntity(entityId);
    if (!entity) {
      throw SDKError.entityNotFound(entityId);
    }

    await this.entities.switchActiveEntity(entityId);

    // Emit entity switched event
    this.events.emit({
      id: this.generateEventId(),
      type: "entity_switched",
      timestamp: Date.now(),
      entityId,
      data: {
        address: entity.address,
        smartAccount: entity.smartAccount,
      },
    });
  }

  /**
   * Get active entity
   */
  getActiveEntity(): Entity | null {
    return this.entities.getActiveEntity();
  }

  /**
   * Validate current configuration
   */
  validateConfig(): ValidationResult {
    return this.configManager.validateConfig();
  }

  /**
   * Subscribe to SDK events
   */
  on(eventType: string, callback: Function): string {
    return this.events.subscribe(eventType, callback);
  }

  /**
   * Unsubscribe from SDK events
   */
  off(subscriptionId: string): boolean {
    return this.events.unsubscribe(subscriptionId);
  }

  /**
   * Get CashToken ABI
   */
  private getCashTokenABI(): any {
    // This would typically be loaded from artifacts
    // For now, returning a minimal ABI based on the demo
    return [
      "function balanceOf(address account) view returns (uint256)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function transferFrom(address from, address to, uint256 amount) returns (bool)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
      "function name() view returns (string)",
      "function totalSupply() view returns (uint256)",
      "function mint(address to, uint256 amount)",
      "function burn(address from, uint256 amount)",
    ];
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.isInitialized = false;
    this.provider = null;
    this.cashTokenContract = null;

    // Stop tracking sessions
    await this.tracking.stopAllSessions();

    // Clear event subscriptions
    this.events.clearSubscriptions();
  }
}
