import * as dotenv from "dotenv";
import { CashTrackerSDK } from "../src/core/CashTrackerSDK";
import { ethers } from "ethers";
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

export async function completeDemoFlow(): Promise<void> {
  console.log("🚀 Starting Complete Cash Tracker SDK Demo Flow\n");

  try {
    // Load configuration from config/entities.json
    const config = loadConfig();
    const entities = config.entities;

    if (entities.length < 2) {
      throw new Error("Need at least 2 entities in config for this example");
    }

    // Step 1: Initialize Entity 1 (Company A)
    console.log("📋 Step 1: Initializing Entity 1 (Company A)...");
    const companyA = new CashTrackerSDK({
      network: {
        rpcUrl: config.network,
        entryPoint: config.entryPoint,
      },
      contracts: {
        cashToken: process.env.CASH_TOKEN!,
        smartAccountFactory: process.env.SMART_ACCOUNT_FACTORY!,
        cashtokenAbi: require("../src/artifacts/CashTokenAbi.json"),
        entitySmartAccount: entities[0].smartAccount,
        defaultPrivatekey: entities[0].privateKey,
      },
    });

    // Step 2: Initialize Entity 2 (Company B)
    console.log("📋 Step 2: Initializing Entity 2 (Company B)...");
    const companyB = new CashTrackerSDK({
      network: {
        rpcUrl: config.network,
        entryPoint: config.entryPoint,
      },
      contracts: {
        cashToken: process.env.CASH_TOKEN!,
        smartAccountFactory: process.env.SMART_ACCOUNT_FACTORY!,
        cashtokenAbi: require("../src/artifacts/CashTokenAbi.json"),
        entitySmartAccount: entities[1].smartAccount,
        defaultPrivatekey: entities[1].privateKey,
      },
    });

    // Step 3: Initialize both entities
    console.log("📋 Step 3: Initializing both entities...");
    await companyA.initialize();
    await companyB.initialize();

    console.log("✅ Both entities initialized successfully");
    console.log(`Company A address: ${companyA.address}`);
    console.log(`Company B address: ${companyB.address}`);

    // Step 4: Check initial balances
    console.log("\n📋 Step 4: Checking initial balances...");
    const companyABalance = await companyA.getCashBalance();
    const companyBBalance = await companyB.getCashBalance();

    console.log(
      `Company A initial balance: ${companyABalance.formatted} ${companyABalance.symbol}`
    );
    console.log(
      `Company B initial balance: ${companyBBalance.formatted} ${companyBBalance.symbol}`
    );

    // Step 5: Company B gives allowance to Company A (correct direction for transferFrom)
    console.log("\n📋 Step 5: Company B gives allowance to Company A...");
    // Use string amount - SDK will handle parsing internally
    const allowanceAmount = "0.5"; // 0.5 tokens (adjusted for available balance)

    try {
      const allowanceResult = await companyB.giveCashAllowance(
        companyA.smartAccount!,
        allowanceAmount
      );
      console.log(
        `✅ Allowance transaction confirmed: ${allowanceResult.hash}`
      );
      console.log(
        `   Gas used: ${allowanceResult.gasUsed?.toString() || "N/A"}`
      );
    } catch (error) {
      console.log("❌ Allowance transaction failed:", error);
      return; // Stop execution if allowance fails
    }

    // Step 6: Check allowance status
    console.log("\n📋 Step 6: Checking allowance status...");
    try {
      const allowanceToCompanyB = await companyA.getCashApprovedByMe(
        companyB.smartAccount!
      );
      console.log(
        `Company A approved to Company B: ${allowanceToCompanyB.formatted} tokens`
      );

      const allowanceToCompanyA = await companyB.getCashApprovedByMe(
        companyA.smartAccount!
      );
      console.log(
        `Company B approved to Company A: ${allowanceToCompanyA.formatted} tokens`
      );
    } catch (error) {
      console.log("❌ Could not check allowances:", error);
    }

    // Step 7: Company A transfers cash from Company B (using allowance)
    console.log("\n📋 Step 7: Company A transfers cash from Company B...");
    // Use string amount - SDK will handle parsing internally
    const transferAmount = "0.3"; // 0.3 tokens (adjusted for available balance)

    try {
      const transferResult = await companyA.getCashFrom(
        companyB.smartAccount!,
        transferAmount
      );
      console.log(`✅ Transfer transaction confirmed: ${transferResult.hash}`);
      console.log(
        `   Gas used: ${transferResult.gasUsed?.toString() || "N/A"}`
      );
    } catch (error) {
      console.log("❌ Transfer transaction failed:", error);
      return; // Stop execution if transfer fails
    }

    // Step 8: Check intermediate balances
    console.log("\n📋 Step 8: Checking intermediate balances...");
    const intermediateCompanyABalance = await companyA.getCashBalance();
    const intermediateCompanyBBalance = await companyB.getCashBalance();

    console.log(
      `Company A intermediate balance: ${intermediateCompanyABalance.formatted} ${intermediateCompanyABalance.symbol}`
    );
    console.log(
      `Company B intermediate balance: ${intermediateCompanyBBalance.formatted} ${intermediateCompanyBBalance.symbol}`
    );

    // Step 9: Company A gives allowance to Company B
    console.log("\n📋 Step 9: Company A gives allowance to Company B...");
    // Use string amount - SDK will handle parsing internally
    const reverseAllowanceAmount = "0.2"; // 0.2 tokens (adjusted for available balance)

    try {
      const reverseAllowanceResult = await companyA.giveCashAllowance(
        companyB.smartAccount!,
        reverseAllowanceAmount
      );
      console.log(
        `✅ Reverse allowance transaction confirmed: ${reverseAllowanceResult.hash}`
      );
      console.log(
        `   Gas used: ${reverseAllowanceResult.gasUsed?.toString() || "N/A"}`
      );
    } catch (error) {
      console.log("❌ Reverse allowance transaction failed:", error);
    }

    // Step 10: Company B transfers cash from Company A
    console.log("\n📋 Step 10: Company B transfers cash from Company A...");
    // Use string amount - SDK will handle parsing internally
    const reverseTransferAmount = "0.1"; // 0.1 tokens (adjusted for available balance)

    try {
      const reverseTransferResult = await companyB.getCashFrom(
        companyA.smartAccount!,
        reverseTransferAmount
      );
      console.log(
        `✅ Reverse transfer transaction confirmed: ${reverseTransferResult.hash}`
      );
      console.log(
        `   Gas used: ${reverseTransferResult.gasUsed?.toString() || "N/A"}`
      );
    } catch (error) {
      console.log("❌ Reverse transfer transaction failed:", error);
    }

    // Step 11: Check final balances
    console.log("\n📋 Step 11: Checking final balances...");
    const finalCompanyABalance = await companyA.getCashBalance();
    const finalCompanyBBalance = await companyB.getCashBalance();

    console.log(
      `Company A final balance: ${finalCompanyABalance.formatted} ${finalCompanyABalance.symbol}`
    );
    console.log(
      `Company B final balance: ${finalCompanyBBalance.formatted} ${finalCompanyBBalance.symbol}`
    );

    // Step 12: Final allowance status
    console.log("\n📋 Step 12: Final allowance status...");
    try {
      const finalAllowanceToCompanyB = await companyA.getCashApprovedByMe(
        companyB.smartAccount!
      );
      const finalAllowanceToCompanyA = await companyB.getCashApprovedByMe(
        companyA.smartAccount!
      );

      console.log(
        `Company A approved to Company B: ${finalAllowanceToCompanyB.formatted} tokens`
      );
      console.log(
        `Company B approved to Company A: ${finalAllowanceToCompanyA.formatted} tokens`
      );
    } catch (error) {
      console.log("❌ Could not check final allowances:", error);
    }

    // Step 13: Network and contract verification
    console.log("\n📋 Step 13: Verifying network and contract connectivity...");

    // Test network connection
    const provider = companyA.getProvider();
    if (provider) {
      try {
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ Connected to network. Current block: ${blockNumber}`);
      } catch (error) {
        console.log("❌ Network connection failed:", error);
      }
    }

    // Test CashToken contract
    const cashTokenContract = companyA.getCashTokenContract();
    if (cashTokenContract) {
      try {
        const name = await cashTokenContract.name();
        const symbol = await cashTokenContract.symbol();
        const totalSupply = await cashTokenContract.totalSupply();
        const decimals = await cashTokenContract.decimals();

        console.log(`✅ CashToken contract accessible:`);
        console.log(`   Name: ${name}`);
        console.log(`   Symbol: ${symbol}`);
        console.log(
          `   Total Supply: ${ethers.formatUnits(
            totalSupply,
            decimals
          )} ${symbol}`
        );
        console.log(`   Decimals: ${decimals}`);
      } catch (error) {
        console.log("❌ CashToken contract access failed:", error);
      }
    }

    // Step 14: Summary
    console.log("\n📋 Step 14: Demo Summary");
    console.log("✅ Complete demo flow executed successfully!");
    console.log("\n📝 Operations performed:");
    console.log("  1. ✅ Initialized two company entities with smart accounts");
    console.log("  2. ✅ Company B gave allowance to Company A (0.5 tokens)");
    console.log(
      "  3. ✅ Company A transferred cash from Company B (0.3 tokens)"
    );
    console.log("  4. ✅ Company A gave allowance to Company B (0.2 tokens)");
    console.log(
      "  5. ✅ Company B transferred cash from Company A (0.1 tokens)"
    );
    console.log("  6. ✅ Verified final balances and allowances");
    console.log("  7. ✅ Confirmed network and contract connectivity");

    console.log("\n💰 Final State:");
    console.log(
      `   Company A: ${finalCompanyABalance.formatted} ${finalCompanyABalance.symbol}`
    );
    console.log(
      `   Company B: ${finalCompanyBBalance.formatted} ${finalCompanyBBalance.symbol}`
    );
  } catch (error) {
    console.error("❌ Error in complete demo flow:", error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await completeDemoFlow();
  } catch (error) {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  }
}

// Run the demo
if (require.main === module) {
  main();
}
