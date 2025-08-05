import { ethers } from "ethers";
import {
  SDKConfig,
  Entity,
  TokenBalance,
  TokenAllowance,
  TransactionResult,
  ValidationResult,
  SDKErrorCode,
} from "../types";
import { ConfigManager } from "./ConfigManager";
import { SDKError } from "./SDKError";
import { ValidationUtils } from "../utils/ValidationUtils";
// Manager imports
import { EntityManager } from "../entities/EntityManager";
import { OperationsManager } from "../operations/OperationsManager";
import { EventManager } from "../tracking/EventManager";

/**
 * Main Cash Tracker SDK class
 * Each instance represents a single entity with its own smart account
 */
export class CashTrackerSDK {
  private config: SDKConfig | null = null;
  private provider: ethers.Provider | null = null;
  private cashTokenContract: ethers.Contract | null = null;
  private wallet: ethers.Wallet | null = null;
  private smartAccountContract: ethers.Contract | null = null;
  private isInitialized = false;
  private entityAddress: string | null = null;
  private smartAccountAddress: string | null = null;

  // Managers
  public readonly configManager: ConfigManager;
  public readonly entities: EntityManager;
  public readonly operations: OperationsManager;
  public readonly events: EventManager;

  constructor(config?: SDKConfig) {
    this.configManager = new ConfigManager();
    this.entities = new EntityManager();
    this.operations = new OperationsManager();
    this.events = new EventManager();

    if (config) {
      this.initializeWithConfig(config);
    }
  }

  /**
   * Connect wallet to the SDK
   * @param walletOrPrivateKey - Wallet instance or private key string
   */
  connect(walletOrPrivateKey: ethers.Wallet | string): void {
    if (typeof walletOrPrivateKey === "string") {
      this.wallet = new ethers.Wallet(walletOrPrivateKey, this.provider);
    } else {
      this.wallet = walletOrPrivateKey;
    }

    this.entityAddress = this.wallet.address;

    // Set up smart account contract if smart account address is configured
    if (this.config?.contracts.entitySmartAccount && this.wallet) {
      this.smartAccountAddress = this.config.contracts.entitySmartAccount;
      this.smartAccountContract = new ethers.Contract(
        this.smartAccountAddress,
        this.getSmartAccountABI(),
        this.wallet
      );
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

      // Setup provider
      this.provider = new ethers.JsonRpcProvider(this.config!.network.rpcUrl);

      // Setup CashToken contract with custom ABI if provided
      const abi = this.config!.contracts.cashtokenAbi || this.getCashTokenABI();
      this.cashTokenContract = new ethers.Contract(
        this.config!.contracts.cashToken,
        abi,
        this.provider
      );

      // Auto-connect wallet if defaultPrivatekey is provided
      if (this.config!.contracts.defaultPrivatekey) {
        this.connect(this.config!.contracts.defaultPrivatekey);
      }

      // Initialize managers
      await this.entities.initialize(this.provider, this.config!);
      await this.operations.initialize(
        this.provider,
        this.cashTokenContract,
        this.config!,
        this
      );

      this.isInitialized = true;

      // Emit initialization event
      this.events.emit({
        id: this.generateEventId(),
        type: "sdk_initialized",
        timestamp: Date.now(),
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
   * Get cash allowance approved to me by another address
   * @param ownerAddress - Address that approved the allowance
   */
  async getCashApprovedToMe(ownerAddress: string): Promise<TokenAllowance> {
    if (!this.isReady()) {
      throw SDKError.configError("SDK not initialized");
    }

    if (!this.smartAccountAddress) {
      throw SDKError.configError("Smart account address not set");
    }

    try {
      const allowance = await this.cashTokenContract!.allowance(
        ownerAddress,
        this.smartAccountAddress
      );
      const decimals = await this.cashTokenContract!.decimals();

      return {
        ownerId: ownerAddress,
        spenderId: this.smartAccountAddress,
        allowance,
        formatted: ethers.formatUnits(allowance, decimals),
      };
    } catch (error) {
      throw SDKError.networkError(
        `Failed to get allowance from ${ownerAddress} to ${this.smartAccountAddress}`,
        { error }
      );
    }
  }

  /**
   * Get cash allowance I approved to another address
   * @param spenderAddress - Address I approved for spending
   */
  async getCashApprovedByMe(spenderAddress: string): Promise<TokenAllowance> {
    if (!this.isReady()) {
      throw SDKError.configError("SDK not initialized");
    }

    if (!this.smartAccountAddress) {
      throw SDKError.configError("Smart account address not set");
    }

    try {
      const allowance = await this.cashTokenContract!.allowance(
        this.smartAccountAddress,
        spenderAddress
      );
      const decimals = await this.cashTokenContract!.decimals();

      return {
        ownerId: this.smartAccountAddress,
        spenderId: spenderAddress,
        allowance,
        formatted: ethers.formatUnits(allowance, decimals),
      };
    } catch (error) {
      throw SDKError.networkError(
        `Failed to get allowance from ${this.smartAccountAddress} to ${spenderAddress}`,
        { error }
      );
    }
  }

  /**
   * Get current entity's cash balance
   */
  async getCashBalance(): Promise<TokenBalance> {
    if (!this.isReady()) {
      throw SDKError.configError("SDK not initialized");
    }

    if (!this.smartAccountAddress) {
      throw SDKError.configError("Smart account address not set");
    }

    try {
      const balance = await this.cashTokenContract!.balanceOf(
        this.smartAccountAddress
      );
      const decimals = await this.cashTokenContract!.decimals();
      const symbol = await this.cashTokenContract!.symbol();

      return {
        entityId: this.smartAccountAddress,
        balance,
        formatted: ethers.formatUnits(balance, decimals),
        decimals,
        symbol,
      };
    } catch (error) {
      throw SDKError.networkError(
        `Failed to get balance for smart account ${this.smartAccountAddress}`,
        { error }
      );
    }
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
   * Get current entity address
   */
  get address(): string | null {
    return this.entityAddress;
  }

  /**
   * Get current smart account address
   */
  get smartAccount(): string | null {
    return this.smartAccountAddress;
  }

  /**
   * Get CashToken ABI
   */
  private getCashTokenABI(): any {
    // Try to load from artifacts directory first
    try {
      const path = require("path");
      const fs = require("fs");

      const artifactPath = path.join(
        __dirname,
        "../artifacts/CashTokenAbi.json"
      );
      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
        return artifact;
      }
    } catch (error) {
      console.warn("Could not load CashTokenAbi.json, using fallback ABI");
    }

    // Fallback to minimal ABI
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
   * Get Smart Account ABI
   */
  private getSmartAccountABI(): any {
    // Try to load from artifacts directory first
    try {
      const path = require("path");
      const fs = require("fs");

      const artifactPath = path.join(
        __dirname,
        "../artifacts/SmartAccountAbi.json"
      );
      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
        return artifact;
      }
    } catch (error) {
      console.warn("Could not load SmartAccountAbi.json, using fallback ABI");
    }

    // Fallback to minimal ABI
    return [
      "function execute(address dest, uint256 value, bytes calldata functionData) external",
      "function getEntryPoint() external view returns (address)",
      "function owner() external view returns (address)",
    ];
  }

  /**
   * Parse units with proper decimal handling
   */
  private parseUnits(amount: string | number, decimals: number): bigint {
    if (typeof amount === "string") {
      return ethers.parseUnits(amount, decimals);
    }
    // If amount is a number, assume it's already in the smallest unit
    return BigInt(amount);
  }

  /**
   * Format units with proper decimal handling
   */
  private formatUnits(amount: bigint, decimals: number): string {
    return ethers.formatUnits(amount, decimals);
  }

  /**
   * Check if entity has sufficient balance for approval
   */
  private async checkBalanceForApproval(amount: bigint): Promise<void> {
    if (!this.smartAccountAddress) {
      throw SDKError.configError("Smart account address not set");
    }

    const balance = await this.cashTokenContract!.balanceOf(
      this.smartAccountAddress
    );

    if (balance < amount) {
      const decimals = await this.cashTokenContract!.decimals();
      const symbol = await this.cashTokenContract!.symbol();

      throw SDKError.validationError(
        `Insufficient balance for approval. Required: ${this.formatUnits(
          amount,
          decimals
        )} ${symbol}, Available: ${this.formatUnits(
          balance,
          decimals
        )} ${symbol}`
      );
    }
  }

  /**
   * Give cash allowance to another address
   * @param spenderAddress - Address to approve for spending
   * @param amount - Amount to approve (can be string or number)
   */
  async giveCashAllowance(
    spenderAddress: string,
    amount: string | number | bigint
  ): Promise<TransactionResult> {
    if (!this.isReady()) {
      throw SDKError.configError("SDK not initialized");
    }

    if (!this.wallet || !this.smartAccountContract) {
      throw SDKError.configError(
        "Wallet not connected or smart account not configured"
      );
    }

    try {
      // Get decimals for proper parsing
      const decimals = await this.cashTokenContract!.decimals();
      const symbol = await this.cashTokenContract!.symbol();

      // Parse amount to bigint
      let amountBigInt: bigint;
      if (typeof amount === "bigint") {
        amountBigInt = amount;
      } else {
        amountBigInt = this.parseUnits(amount.toString(), decimals);
      }

      // Check if entity has sufficient balance for approval
      await this.checkBalanceForApproval(amountBigInt);

      console.log(
        `Approving ${this.formatUnits(
          amountBigInt,
          decimals
        )} ${symbol} for: ${spenderAddress}`
      );

      // Encode approval data
      const approveData = this.cashTokenContract!.interface.encodeFunctionData(
        "approve",
        [spenderAddress, amountBigInt]
      );

      // Execute through smart account
      const approveTx = await this.smartAccountContract.execute(
        this.cashTokenContract!.target,
        0,
        approveData
      );

      const receipt = await approveTx.wait();

      return {
        hash: approveTx.hash,
        status: "confirmed",
        receipt,
        gasUsed: receipt?.gasUsed,
        gasPrice: receipt?.gasPrice,
      };
    } catch (error) {
      throw SDKError.transactionFailed(
        `Failed to approve tokens for ${spenderAddress}`,
        { error }
      );
    }
  }

  /**
   * Get cash from another address (transferFrom)
   * @param fromAddress - Address to transfer from
   * @param amount - Amount to transfer (can be string, number, or bigint, optional - will use full allowance if not specified)
   */
  async getCashFrom(
    fromAddress: string,
    amount?: string | number | bigint
  ): Promise<TransactionResult> {
    if (!this.isReady()) {
      throw SDKError.configError("SDK not initialized");
    }

    if (!this.wallet || !this.smartAccountContract) {
      throw SDKError.configError(
        "Wallet not connected or smart account not configured"
      );
    }

    if (!this.smartAccountAddress) {
      throw SDKError.configError("Smart account address not set");
    }

    try {
      const decimals = await this.cashTokenContract!.decimals();
      const symbol = await this.cashTokenContract!.symbol();

      // If amount not specified, use full allowance
      let amountBigInt: bigint;
      if (!amount) {
        const allowance = await this.cashTokenContract!.allowance(
          fromAddress,
          this.smartAccountAddress
        );
        amountBigInt = allowance;
      } else {
        // Parse amount to bigint
        if (typeof amount === "bigint") {
          amountBigInt = amount;
        } else {
          amountBigInt = this.parseUnits(amount.toString(), decimals);
        }
      }

      // Check if there's sufficient allowance
      const allowance = await this.cashTokenContract!.allowance(
        fromAddress,
        this.smartAccountAddress
      );

      if (allowance < amountBigInt) {
        throw SDKError.validationError(
          `Insufficient allowance. Required: ${this.formatUnits(
            amountBigInt,
            decimals
          )} ${symbol}, Available: ${this.formatUnits(
            allowance,
            decimals
          )} ${symbol}`
        );
      }

      console.log(
        `Transferring ${this.formatUnits(
          amountBigInt,
          decimals
        )} ${symbol} from ${fromAddress} to ${this.smartAccountAddress}`
      );

      // Encode transferFrom data
      const transferFromData =
        this.cashTokenContract!.interface.encodeFunctionData("transferFrom", [
          fromAddress,
          this.smartAccountAddress,
          amountBigInt,
        ]);

      // Execute through smart account
      const transferTx = await this.smartAccountContract.execute(
        this.cashTokenContract!.target,
        0,
        transferFromData
      );

      const receipt = await transferTx.wait();

      return {
        hash: transferTx.hash,
        status: "confirmed",
        receipt,
        gasUsed: receipt?.gasUsed,
        gasPrice: receipt?.gasPrice,
      };
    } catch (error) {
      throw SDKError.transactionFailed(
        `Failed to transfer tokens from ${fromAddress}`,
        { error }
      );
    }
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
    this.wallet = null;
    this.smartAccountContract = null;
    this.entityAddress = null;
    this.smartAccountAddress = null;

    // Stop tracking sessions
    // await this.tracking.stopAllSessions(); // This line is removed

    // Clear event subscriptions
    this.events.clearSubscriptions();
  }

  // Legacy methods for backward compatibility
  async getBalance(entityId: string): Promise<TokenBalance> {
    return this.getCashBalance();
  }

  async approveTokens(
    ownerId: string,
    spenderId: string,
    amount: bigint
  ): Promise<TransactionResult> {
    return this.giveCashAllowance(spenderId, amount);
  }

  async getAllowance(
    ownerId: string,
    spenderId: string
  ): Promise<TokenAllowance> {
    return this.getCashApprovedByMe(spenderId);
  }

  async transferFrom(
    spenderId: string,
    fromId: string,
    toId: string,
    amount: bigint
  ): Promise<TransactionResult> {
    return this.getCashFrom(fromId, amount);
  }
}
