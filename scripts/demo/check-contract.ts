import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load environment variables from .env.demo
dotenv.config({ path: `${__dirname}/.demo.env` });

async function main() {
    try {
        console.log("🔍 Checking CashToken Contract Status\n");

        // Setup provider
        const provider = new ethers.JsonRpcProvider(process.env.NETWORK_RPC_URL);
        
        // Get CashToken contract address
        const cashTokenAddress = process.env.CASH_TOKEN;
        if (!cashTokenAddress) throw new Error("CASH_TOKEN not set in .demo.env");

        // Load CashToken artifact
        const artifactPath = path.join(__dirname, "../../artifacts/contracts/CashToken.sol/CashToken.json");
        if (!fs.existsSync(artifactPath)) {
            throw new Error("CashToken artifact not found. Please compile contracts first.");
        }
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

        // Setup CashToken contract
        const cashToken = new ethers.Contract(
            cashTokenAddress,
            artifact.abi,
            provider
        );

        // Get token info
        const tokenName = await cashToken.name();
        const tokenSymbol = await cashToken.symbol();
        const tokenDecimals = await cashToken.decimals();
        const totalSupply = await cashToken.totalSupply();

        console.log(`📋 Token Info:`);
        console.log(`   Name: ${tokenName}`);
        console.log(`   Symbol: ${tokenSymbol}`);
        console.log(`   Decimals: ${tokenDecimals}`);
        console.log(`   Contract: ${cashTokenAddress}`);
        console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, tokenDecimals)} ${tokenSymbol}\n`);

        // Check contract owner
        try {
            const owner = await cashToken.owner();
            console.log(`👑 Contract Owner: ${owner}`);
        } catch (error) {
            console.log(`❌ Could not get owner: ${error}`);
        }

        // Load entities from config
        const configPath = path.join(__dirname, "./config/entities.json");
        if (!fs.existsSync(configPath)) {
            throw new Error("entities.json not found. Please run setup-smart-account.ts first.");
        }
        const entities = JSON.parse(fs.readFileSync(configPath, "utf8"));

        // Check balances for all entities
        console.log("📊 Entity Balances:");
        for (let i = 0; i < entities.entities.length; i++) {
            const entity = entities.entities[i];
            const balance = await cashToken.balanceOf(entity.smartAccount);
            const formattedBalance = ethers.formatUnits(balance, tokenDecimals);
            console.log(`   Entity ${i + 1} (${entity.smartAccount}): ${formattedBalance} ${tokenSymbol}`);
        }

        // Check balances for wallet addresses
        console.log("\n📊 Wallet Address Balances:");
        for (let i = 0; i < entities.entities.length; i++) {
            const entity = entities.entities[i];
            const balance = await cashToken.balanceOf(entity.address);
            const formattedBalance = ethers.formatUnits(balance, tokenDecimals);
            console.log(`   Wallet ${i + 1} (${entity.address}): ${formattedBalance} ${tokenSymbol}`);
        }

        console.log("\n✅ Contract check completed!");

    } catch (error) {
        console.error("❌ Failed to check contract:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 