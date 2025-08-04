import { CashTrackerSDK } from "../src/core/CashTrackerSDK";
import { ethers } from "ethers";
import { getEntityIds } from "../src/utils/helpers";

/**
 * Complete Demo Flow Example
 * Replicates all functionality from the demo scripts:
 * - 0.setup-smart-account.ts
 * - 1.run-account.ts
 * - tracker.ts
 */

async function completeDemoFlow() {
  console.log("🚀 Starting Complete Demo Flow Example\n");

  try {
    // Step 1: Initialize SDK with full configuration
    const sdk = new CashTrackerSDK({
      network: {
        rpcUrl: process.env.NETWORK_RPC_URL || "https://sepolia.base.org",
        entryPoint:
          process.env.ENTRY_POINT ||
          "0x1e2717BC0dcE0a6632fe1B057e948ec3EF50E38b",
      },
      contracts: {
        cashToken:
          process.env.CASH_TOKEN ||
          "0xc3E3282048cB2F67b8e08447e95c37f181E00133",
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

    await sdk.initialize();
    console.log("✅ SDK initialized successfully");

    // Step 2: Load Existing Smart Accounts (0.setup-smart-account.ts)
    console.log("\n📦 Step 1: Loading Existing Smart Accounts");
    console.log("=".repeat(50));

    // Load entities from existing demo configuration
    const entities = await sdk.loadEntitiesFromDemo(
      "../scripts/demo/config/entities.json"
    );
    console.log(`✅ Successfully loaded ${entities.length} Smart Accounts`);

    // Step 3: Interactive Operations (1.run-account.ts)
    console.log("\n🎮 Step 2: Interactive Operations");
    console.log("=".repeat(50));

    // Simulate the interactive menu from 1.run-account.ts
    const operations = [
      {
        name: "Check Balance",
        action: async () => {
          console.log("\n💰 Checking balances...");
          const balances = await sdk.getAllBalances();
          for (const balance of balances) {
            console.log(
              `Entity ${balance.entityId}: ${balance.formatted} ${balance.symbol}`
            );
          }
        },
      },
      {
        name: "Approve Tokens",
        action: async () => {
          console.log("\n✅ Approving tokens...");
          const approveAmount = ethers.parseEther("100");
          const entityIds = getEntityIds(entities.length);
          const result = await sdk.approveTokens(
            entityIds[0],
            entityIds[1],
            approveAmount
          );
          console.log(`✅ Approval transaction: ${result.hash}`);
        },
      },
      {
        name: "Check Allowance",
        action: async () => {
          console.log("\n🔍 Checking allowance...");
          const entityIds = getEntityIds(entities.length);
          const allowance = await sdk.getAllowance(entityIds[0], entityIds[1]);
          console.log(`Allowance: ${allowance.formatted}`);
        },
      },
      {
        name: "Transfer Tokens",
        action: async () => {
          console.log("\n💸 Transferring tokens...");
          const transferAmount = ethers.parseEther("50");
          const entityIds = getEntityIds(entities.length);
          const result = await sdk.transferFrom(
            entityIds[1],
            entityIds[0],
            entityIds[2],
            transferAmount
          );
          console.log(`✅ Transfer transaction: ${result.hash}`);
        },
      },
      {
        name: "Switch Entity",
        action: async () => {
          console.log("\n🔄 Switching entity...");
          const entityIds = getEntityIds(entities.length);
          await sdk.switchEntity(entityIds[1]);
          const activeEntity = sdk.getActiveEntity();
          console.log(`✅ Switched to: ${activeEntity?.smartAccount}`);
        },
      },
    ];

    // Execute operations
    for (const operation of operations) {
      console.log(`\n📋 Executing: ${operation.name}`);
      await operation.action();
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Pause between operations
    }

    // Step 4: Real-time Tracking (tracker.ts)
    console.log("\n📊 Step 3: Real-time Tracking");
    console.log("=".repeat(50));

    // Set up event listeners
    console.log("🎯 Setting up event listeners...");

    sdk.on("balance_changed", (event: any) => {
      console.log(`💰 Balance Update: ${event.entityId}`);
      console.log(`  Previous: ${event.formatted.previous}`);
      console.log(`  Current:  ${event.formatted.new}`);
      console.log(`  Change:   ${event.formatted.change}`);
    });

    sdk.on("allowance_changed", (event: any) => {
      console.log(`✅ Allowance Update: ${event.ownerId} → ${event.spenderId}`);
      console.log(`  Previous: ${event.formatted.previous}`);
      console.log(`  Current:  ${event.formatted.new}`);
      console.log(`  Change:   ${event.formatted.change}`);
    });

    // Start tracking sessions
    console.log("\n📈 Starting tracking sessions...");

    // Fast tracking (2 seconds)
    const fastSession = await sdk.startTracking({
      interval: 2000,
      entities: ["entity1", "entity2"],
      includeBalances: true,
      includeAllowances: false,
      onUpdate: (state) => {
        console.log("\n⚡ Fast Update (2s):");
        console.log(
          "Balances:",
          state.balances.map((b: any) => `${b.entityId}: ${b.formatted}`)
        );
      },
    });

    // Slow tracking (8 seconds) with allowances
    const slowSession = await sdk.startTracking({
      interval: 8000,
      entities: ["entity1", "entity2", "entity3"],
      includeBalances: true,
      includeAllowances: true,
      onUpdate: (state) => {
        console.log("\n🐌 Slow Update (8s):");
        console.log(
          "Balances:",
          state.balances.map((b: any) => `${b.entityId}: ${b.formatted}`)
        );
        console.log(
          "Allowances:",
          state.allowances.map(
            (a: any) => `${a.ownerId} → ${a.spenderId}: ${a.formatted}`
          )
        );
      },
    });

    // Let tracking run for 30 seconds
    console.log("⏱️  Tracking for 30 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Stop tracking sessions
    fastSession.stop();
    slowSession.stop();
    console.log("🛑 Tracking sessions stopped");

    // Step 5: Final State Report
    console.log("\n📋 Step 4: Final State Report");
    console.log("=".repeat(50));

    const finalState = await sdk.getTrackingState();
    console.log("Final balances:");
    for (const balance of finalState.balances) {
      console.log(
        `  ${balance.entityId}: ${balance.formatted} ${balance.symbol}`
      );
    }

    console.log("\nFinal allowances:");
    for (const allowance of finalState.allowances) {
      console.log(
        `  ${allowance.ownerId} → ${allowance.spenderId}: ${allowance.formatted}`
      );
    }

    // Step 6: Cleanup
    console.log("\n🧹 Step 5: Cleanup");
    console.log("=".repeat(50));

    await sdk.cleanup();
    console.log("✅ SDK cleanup completed");

    console.log("\n🎉 Complete demo flow finished successfully!");
  } catch (error) {
    console.error("❌ Error in complete demo flow:", error);
    throw error;
  }
}

/**
 * Load from demo format example
 */
async function loadFromDemoFormat() {
  console.log("\n🔄 Loading from Demo Format Example");
  console.log("=".repeat(50));

  try {
    const sdk = new CashTrackerSDK();

    // Load entities from the demo entities.json file
    const entities = await sdk.loadEntitiesFromDemo(
      "../../scripts/demo/config/entities.json"
    );
    console.log(`✅ Loaded ${entities.length} entities from demo format`);

    // Display entity information
    console.log("\n📋 Entity Information:");
    for (const entity of entities) {
      console.log(`  Entity ID: ${entity.id}`);
      console.log(`  Address: ${entity.address}`);
      console.log(`  Smart Account: ${entity.smartAccount}`);
      console.log("");
    }

    // Check balances
    console.log("💰 Current Balances:");
    const balances = await sdk.getAllBalances();
    for (const balance of balances) {
      console.log(
        `  ${balance.entityId}: ${balance.formatted} ${balance.symbol}`
      );
    }

    await sdk.cleanup();
    console.log("✅ Demo format loading completed");
  } catch (error) {
    console.error("❌ Error loading from demo format:", error);
    throw error;
  }
}

/**
 * Interactive menu simulation
 */
async function interactiveMenu() {
  console.log("\n🎮 Interactive Menu Simulation");
  console.log("=".repeat(50));

  try {
    const sdk = new CashTrackerSDK({
      network: {
        rpcUrl: "https://sepolia.base.org",
        entryPoint: "0x1e2717BC0dcE0a6632fe1B057e948ec3EF50E38b",
      },
      contracts: {
        cashToken: "0xc3E3282048cB2F67b8e08447e95c37f181E00133",
      },
    });

    await sdk.initialize();
    await sdk.loadEntitiesFromDemo("../../scripts/demo/config/entities.json");

    // Simulate menu options from 1.run-account.ts
    const menuOptions = [
      "Check CashToken balance",
      "Approve tokens",
      "Check allowance",
      "Transfer approved tokens (transferFrom)",
      "Switch Account",
      "Exit",
    ];

    console.log("📋 Available Operations:");
    menuOptions.forEach((option, index) => {
      console.log(`  ${index + 1}. ${option}`);
    });

    // Simulate user selections
    const selections = [
      { choice: 1, description: "Check balance" },
      { choice: 2, description: "Approve tokens" },
      { choice: 3, description: "Check allowance" },
      { choice: 4, description: "Transfer tokens" },
      { choice: 6, description: "Exit" },
    ];

    for (const selection of selections) {
      console.log(`\n🎯 User selected: ${selection.description}`);

      switch (selection.choice) {
        case 1:
          const balances = await sdk.getAllBalances();
          console.log(
            "Current balances:",
            balances.map((b) => `${b.entityId}: ${b.formatted}`)
          );
          break;
        case 2:
          const approveResult = await sdk.approveTokens(
            "entity1",
            "entity2",
            ethers.parseEther("100")
          );
          console.log("Approval result:", approveResult.hash);
          break;
        case 3:
          const allowance = await sdk.getAllowance("entity1", "entity2");
          console.log("Allowance:", allowance.formatted);
          break;
        case 4:
          const transferResult = await sdk.transferFrom(
            "entity2",
            "entity1",
            "entity3",
            ethers.parseEther("25")
          );
          console.log("Transfer result:", transferResult.hash);
          break;
        case 6:
          console.log("Exiting...");
          break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await sdk.cleanup();
    console.log("✅ Interactive menu completed");
  } catch (error) {
    console.error("❌ Error in interactive menu:", error);
    throw error;
  }
}

// Run all examples
async function main() {
  try {
    await completeDemoFlow();
    await loadFromDemoFormat();
    await interactiveMenu();
  } catch (error) {
    console.error("❌ Example failed:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { completeDemoFlow, loadFromDemoFormat, interactiveMenu };
