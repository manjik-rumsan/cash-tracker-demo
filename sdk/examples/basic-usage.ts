import * as dotenv from "dotenv";
import { CashTrackerSDK } from "../src/core/CashTrackerSDK";
import { resolveEntitiesConfigPath, getEntityIds } from "../src/utils/helpers";
import * as fs from "fs";

// Load environment variables
dotenv.config();

export async function basicUsage(): Promise<void> {
  console.log("🚀 Starting Cash Tracker SDK Basic Usage Example\n");

  try {
    // 1. Initialize SDK with full configuration
    const sdk = new CashTrackerSDK({
      network: {
        rpcUrl: process.env.NETWORK_RPC_URL!,
        entryPoint: process.env.ENTRY_POINT!,
      },
      contracts: {
        cashToken: process.env.CASH_TOKEN!,
      },
      options: {
        gasLimit: process.env.GAS_LIMIT
          ? parseInt(process.env.GAS_LIMIT)
          : 500000,
        retryAttempts: process.env.RETRY_ATTEMPTS
          ? parseInt(process.env.RETRY_ATTEMPTS)
          : 3,
        timeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 30000,
      },
      paths: {
        entitiesConfig:
          process.env.ENTITIES_CONFIG_PATH ||
          "../scripts/demo/config/entities.json",
        smartAccountArtifact: process.env.SMART_ACCOUNT_ARTIFACT_PATH,
        cashTokenArtifact: process.env.CASH_TOKEN_ARTIFACT_PATH,
        logs: process.env.LOGS_PATH || "./logs",
      },
      environment: {
        networkRpcUrl: process.env.NETWORK_RPC_URL,
        entryPoint: process.env.ENTRY_POINT,
        cashTokenAddress: process.env.CASH_TOKEN,
        gasLimit: process.env.GAS_LIMIT
          ? parseInt(process.env.GAS_LIMIT)
          : undefined,
        retryAttempts: process.env.RETRY_ATTEMPTS
          ? parseInt(process.env.RETRY_ATTEMPTS)
          : undefined,
        timeout: process.env.TIMEOUT
          ? parseInt(process.env.TIMEOUT)
          : undefined,
      },
    });

    console.log("✅ SDK initialized successfully");

    // 2. Load existing entities from demo format
    console.log("\n📦 Loading existing entities from demo format...");
    const entitiesPath = resolveEntitiesConfigPath();
    const entities = await sdk.loadEntitiesFromDemo(entitiesPath);
    console.log(`✅ Loaded ${entities.length} existing entities`);

    // 3. Display loaded entities
    console.log("\n📋 Loaded Entities:");
    entities.forEach((entity, index) => {
      console.log(`  Entity ${index + 1}:`);
      console.log(`    Address: ${entity.address}`);
      console.log(`    Smart Account: ${entity.smartAccount}`);
    });

    // 4. Check balance for first entity
    console.log("\n💰 Checking balance for first entity...");
    try {
      const entityIds = getEntityIds(entities.length);
      const balance = await sdk.getBalance(entityIds[0]);
      console.log(`Balance: ${balance.formatted}`);
    } catch (error) {
      console.log(
        "⚠️  Could not check balance (entity not loaded into SDK):",
        error
      );
    }

    // 5. Check allowance between entities
    console.log("\n🔍 Checking allowance between entities...");
    try {
      const entityIds = getEntityIds(entities.length);
      const allowance = await sdk.getAllowance(entityIds[0], entityIds[1]);
      console.log(`Allowance: ${allowance.formatted}`);
    } catch (error) {
      console.log(
        "⚠️  Could not check allowance (entities not loaded into SDK):",
        error
      );
    }

    // 6. Test network connection
    console.log("\n🌐 Testing network connection...");
    const provider = sdk.getProvider();
    if (provider) {
      try {
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ Connected to network. Current block: ${blockNumber}`);
      } catch (error) {
        console.log("⚠️  Network connection failed:", error);
      }
    }

    // 7. Test CashToken contract
    console.log("\n💰 Testing CashToken contract...");
    const cashTokenContract = sdk.getCashTokenContract();
    if (cashTokenContract) {
      try {
        const name = await cashTokenContract.name();
        const symbol = await cashTokenContract.symbol();
        console.log(
          `✅ CashToken contract accessible. Name: ${name}, Symbol: ${symbol}`
        );
      } catch (error) {
        console.log("⚠️  CashToken contract access failed:", error);
      }
    }

    console.log("\n✅ Basic usage example completed successfully!");
    console.log(
      "\n📝 Note: To test full functionality with balances and allowances,"
    );
    console.log(
      "   you need to load the entities into the SDK using loadEntitiesFromDemo()."
    );
  } catch (error) {
    console.error("❌ Error in basic usage example:", error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await basicUsage();
  } catch (error) {
    console.error("❌ Example failed:", error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main();
}
