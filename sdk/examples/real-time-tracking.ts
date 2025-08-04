import { CashTrackerSDK } from "../src/core/CashTrackerSDK";
import { ethers } from "ethers";
import { getEntityIds } from "../src/utils/helpers";

/**
 * Real-time tracking example
 * Demonstrates the tracking functionality similar to tracker.ts
 */
async function realTimeTracking() {
  console.log("📊 Starting Real-time Tracking Example\n");

  try {
    // Initialize SDK with full configuration
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
    console.log("✅ SDK initialized");

    // Load existing entities from demo
    const entities = await sdk.loadEntitiesFromDemo(
      process.env.ENTITIES_CONFIG_PATH || "../scripts/demo/config/entities.json"
    );
    console.log(`✅ Loaded ${entities.length} entities`);

    // Set up event listeners for real-time updates
    console.log("\n🎯 Setting up event listeners...");

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

    // Start tracking with different intervals
    console.log("\n📈 Starting tracking sessions...");

    // Session 1: Fast updates (2 seconds)
    const entityIds = getEntityIds(entities.length);
    const fastSession = await sdk.startTracking({
      interval: 2000,
      entities: [entityIds[0], entityIds[1]],
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

    // Session 2: Slow updates (10 seconds) with allowances
    const slowSession = await sdk.startTracking({
      interval: 10000,
      entities: [entityIds[0], entityIds[1], entityIds[2]],
      includeBalances: true,
      includeAllowances: true,
      onUpdate: (state) => {
        console.log("\n🐌 Slow Update (10s):");
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

    // Let tracking run for 60 seconds
    console.log("⏱️  Tracking for 60 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 60000));

    // Stop tracking sessions
    fastSession.stop();
    slowSession.stop();
    console.log("🛑 Tracking sessions stopped");

    // Get final state
    console.log("\n📋 Final State:");
    const finalState = await sdk.getTrackingState();
    console.log("Final balances:", finalState.balances);
    console.log("Final allowances:", finalState.allowances);

    await sdk.cleanup();
    console.log("✅ Real-time tracking example completed");
  } catch (error) {
    console.error("❌ Error in real-time tracking example:", error);
    throw error;
  }
}

/**
 * Interactive tracking example
 * Similar to the interactive menu in tracker.ts
 */
async function interactiveTracking() {
  console.log("\n🎮 Starting Interactive Tracking Example\n");

  try {
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
    await sdk.loadEntitiesFromDemo(
      process.env.ENTITIES_CONFIG_PATH || "../scripts/demo/config/entities.json"
    );

    let isTracking = false;
    let currentSession: any = null;
    let refreshInterval = 5000;

    // Simulate interactive menu
    console.log("🎯 Interactive Tracking Menu:");
    console.log("1. Start tracking");
    console.log("2. Stop tracking");
    console.log("3. Change interval");
    console.log("4. Show current state");
    console.log("5. Exit");

    // Simulate user interactions
    const actions = [
      { action: "start", delay: 1000 },
      { action: "state", delay: 3000 },
      { action: "interval", delay: 2000 },
      { action: "state", delay: 3000 },
      { action: "stop", delay: 2000 },
      { action: "exit", delay: 1000 },
    ];

    for (const { action, delay } of actions) {
      await new Promise((resolve) => setTimeout(resolve, delay));

      switch (action) {
        case "start":
          if (!isTracking) {
            console.log("\n▶️  Starting tracking...");
            const entityIds = getEntityIds(3); // Assuming 3 entities
            currentSession = await sdk.startTracking({
              interval: refreshInterval,
              entities: [entityIds[0], entityIds[1], entityIds[2]],
              includeBalances: true,
              includeAllowances: true,
              onUpdate: (state) => {
                console.log("\n📊 Update:");
                console.log(
                  "Balances:",
                  state.balances.map(
                    (b: any) => `${b.entityId}: ${b.formatted}`
                  )
                );
              },
            });
            isTracking = true;
            console.log("✅ Tracking started");
          }
          break;

        case "stop":
          if (isTracking && currentSession) {
            console.log("\n⏹️  Stopping tracking...");
            currentSession.stop();
            isTracking = false;
            currentSession = null;
            console.log("✅ Tracking stopped");
          }
          break;

        case "interval":
          refreshInterval = 3000; // Change to 3 seconds
          console.log(`\n⚙️  Changed interval to ${refreshInterval}ms`);
          if (isTracking && currentSession) {
            currentSession.stop();
            const entityIds = getEntityIds(3); // Assuming 3 entities
            currentSession = await sdk.startTracking({
              interval: refreshInterval,
              entities: [entityIds[0], entityIds[1], entityIds[2]],
              includeBalances: true,
              includeAllowances: true,
              onUpdate: (state) => {
                console.log("\n📊 Update (3s):");
                console.log(
                  "Balances:",
                  state.balances.map(
                    (b: any) => `${b.entityId}: ${b.formatted}`
                  )
                );
              },
            });
          }
          break;

        case "state":
          console.log("\n📋 Current State:");
          const state = await sdk.getTrackingState();
          console.log("Balances:", state.balances);
          console.log("Allowances:", state.allowances);
          break;

        case "exit":
          if (currentSession) {
            currentSession.stop();
          }
          await sdk.cleanup();
          console.log("👋 Exiting interactive tracking");
          return;
      }
    }
  } catch (error) {
    console.error("❌ Error in interactive tracking example:", error);
    throw error;
  }
}

// Run examples
async function main() {
  try {
    await realTimeTracking();
    await interactiveTracking();
  } catch (error) {
    console.error("❌ Example failed:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { realTimeTracking, interactiveTracking };
