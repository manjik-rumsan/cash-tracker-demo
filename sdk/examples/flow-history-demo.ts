import * as dotenv from "dotenv";
import { CashTokenSDK } from "../src/core/CashTokenSDK";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
dotenv.config();

// Load config from config/entities.json
const loadConfig = () => {
  const configPath = path.join(__dirname, "../config/entities.json");
  const configData = fs.readFileSync(configPath, "utf8");
  return JSON.parse(configData);
};

// Helper function to format the comprehensive flow history
const formatTransactionFlowHistory = (data: any) => {
  console.log("\n📊 TRANSACTION FLOW HISTORY");
  console.log("=".repeat(60));

  // Summary
  console.log("\n📋 SUMMARY:");
  console.log(`   Total Paths: ${data.summary.totalPaths}`);
  console.log(`   Total Flows: ${data.summary.totalFlows}`);
  console.log(`   Total Amount: ${data.summary.totalAmount}`);
  console.log(`   Total Transactions: ${data.summary.totalTransactions}`);
  console.log(
    `   Time Range: ${new Date(
      data.summary.timeRange.start
    ).toLocaleString()} → ${new Date(
      data.summary.timeRange.end
    ).toLocaleString()}`
  );

  // Paths
  console.log("\n🛤️  PATHS:");
  data.paths.forEach((path: any, index: number) => {
    console.log(`\n   ${index + 1}. ${path.pathAliases.join(" → ")}`);
    console.log(`      ID: ${path.id}`);
    console.log(`      Total Flows: ${path.totalFlows}`);
    console.log(`      Total Amount: ${path.totalAmount}`);
    console.log(`      Entity Totals:`);
    Object.entries(path.entityTotalsWithAliases).forEach(
      ([alias, totals]: [string, any]) => {
        console.log(
          `         ${alias}: Received ${totals.received}, Sent ${totals.sent}, Balance ${totals.balance}`
        );
      }
    );
  });

  // Steps
  console.log("\n👣 STEPS:");
  data.steps.forEach((step: any) => {
    console.log(
      `\n   Step ${step.stepNumber}: ${step.from.alias} (${step.from.role}) → ${step.to.alias} (${step.to.role})`
    );
    console.log(`      Amount: ${step.amount}`);
    console.log(`      TX: ${step.transactionHash.slice(0, 10)}...`);
    console.log(`      Block: ${step.blockNumber}`);
    console.log(`      Time: ${new Date(step.timestamp).toLocaleString()}`);
    console.log(`      Status: ${step.status}`);
  });

  // Flows
  console.log("\n🌊 FLOWS:");
  data.flows.forEach((flow: any) => {
    console.log(`\n   ${flow.flowId}: ${flow.from.alias} → ${flow.to.alias}`);
    console.log(`      Path ID: ${flow.pathId}`);
    console.log(`      Amount: ${flow.amount}`);
    console.log(`      Type: ${flow.type}`);
    console.log(`      TX: ${flow.transactionHash.slice(0, 10)}...`);
    console.log(`      Block: ${flow.blockNumber}`);
    console.log(`      Time: ${new Date(flow.timestamp).toLocaleString()}`);
  });

  // Blockchain Info
  console.log("\n⛓️  BLOCKCHAIN INFO:");
  console.log(`   Network: ${data.blockchainInfo.network}`);
  console.log(
    `   Contract: ${data.blockchainInfo.contractAddress.slice(0, 10)}...`
  );
  console.log(`   Last Block: ${data.blockchainInfo.lastBlockNumber}`);
  console.log(
    `   Query Time: ${new Date(
      data.blockchainInfo.queryTimestamp
    ).toLocaleString()}`
  );
};

export async function flowHistoryDemo(): Promise<void> {
  console.log("🚀 Cash Tracker SDK - Transaction Flow History Demo\n");

  try {
    const config = loadConfig();
    const entities = config.entities;

    if (entities.length < 3) {
      throw new Error("Need at least 3 entities for A->B->C flow demo");
    }

    // Extract smart addresses and aliases for A->B->C flow
    const smartAddresses = entities.map((entity: any) => entity.smartAccount);
    const aliases = entities.map(
      (entity: any) =>
        entity.alias ||
        `Entity_${String.fromCharCode(65 + entities.indexOf(entity))}`
    );

    console.log("📋 ENTITIES:");
    console.log(`   Path: ${aliases.join(" → ")}`);
    console.log(
      `   Addresses: ${smartAddresses
        .map((addr: string) => addr.slice(0, 10) + "...")
        .join(" → ")}`
    );

    // Initialize SDK for blockchain queries (read-only mode)
    const flowTracker = new CashTokenSDK({
      network: {
        rpcUrl: config.network,
        entryPoint: config.entryPoint,
      },
      contracts: {
        cashToken: process.env.CASH_TOKEN!,
        cashtokenAbi: require("../src/artifacts/CashTokenAbi.json"),
      },
      // Pass entities for read-only flow tracking (without private keys)
      entities: entities.slice(0, 3).map((entity: any) => ({
        smartAccount: entity.smartAccount,
        alias:
          entity.alias ||
          `Entity_${String.fromCharCode(65 + entities.indexOf(entity))}`,
        // Don't include privateKey for read-only operations
      })),
    });

    await flowTracker.initialize();
    console.log("\n✅ SDK initialized successfully");

    // Get comprehensive transaction flow history
    console.log("\n🔍 QUERYING BLOCKCHAIN...");
    const flowHistory = await flowTracker.getTransactionFlowHistory(
      entities.slice(0, 3).map((entity: any) => ({
        smartAddress: entity.smartAccount,
        alias:
          entity.alias ||
          `Entity_${String.fromCharCode(65 + entities.indexOf(entity))}`,
      }))
    );
    console.log("first", JSON.stringify(flowHistory, null, 2));

    // Format and display the comprehensive data
    formatTransactionFlowHistory(flowHistory);

    console.log("\n✅ Demo completed successfully!");
  } catch (error) {
    console.error("❌ Error in flow history demo:", error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await flowHistoryDemo();
  } catch (error) {
    console.error("❌ Flow history demo failed:", error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main();
}
