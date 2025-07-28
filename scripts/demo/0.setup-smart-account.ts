import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load environment variables from .env.demo
dotenv.config({ path: `${__dirname}/.demo.env` });

async function main() {
    try {
        // Setup provider
        const provider = new ethers.JsonRpcProvider(process.env.NETWORK_RPC_URL);
        
        // Get EntryPoint address
        const entryPointAddress = process.env.ENTRY_POINT;
        if (!entryPointAddress) throw new Error("ENTRY_POINT not set in .env.demo");

        // Get private keys
        const privateKeys = process.env.ENTITIES_PK?.split(",") || [];
        if (privateKeys.length === 0) throw new Error("ENTITIES_PK not set in .env.demo");

        console.log(`Found ${privateKeys.length} private keys to setup Smart Accounts for`);

        // Load Smart Account artifacts
        const artifactPath = path.join(__dirname, "../../artifacts/contracts/SmartAccount.sol/SmartAccount.json");
        if (!fs.existsSync(artifactPath)) {
            throw new Error("SmartAccount artifact not found. Please compile contracts first.");
        }
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

        const entities: Array<{
            privateKey: string;
            address: string;
            smartAccount: string;
        }> = [];

        // Deploy a Smart Account for each private key
        for (let i = 0; i < privateKeys.length; i++) {
            const privateKey = privateKeys[i];
            const wallet = new ethers.Wallet(privateKey, provider);
            
            console.log(`
[${i + 1}/${privateKeys.length}] Deploying Smart Account for ${wallet.address}`);

            try {
                // Create contract factory for each deployment (using the owner's wallet)
                const SmartAccount = new ethers.ContractFactory(
                    artifact.abi,
                    artifact.bytecode,
                    wallet // Each wallet deploys its own SmartAccount
                );
                // Deploy SmartAccount with the wallet as owner
                const smartAccount = await SmartAccount.deploy(
                    entryPointAddress,
                );

                await smartAccount.waitForDeployment();
                const smartAccountAddress = await smartAccount.getAddress();

                console.log(`Smart Account deployed at: ${smartAccountAddress}`);
                
                entities.push({
                    privateKey,
                    address: wallet.address,
                    smartAccount: smartAccountAddress,
                });
            } catch (error) {
                console.error(`Failed to deploy Smart Account for ${wallet.address}:`, error);
                throw error;
            }
        }

        // Create config directory if it doesn't exist
        const configDir = path.join(__dirname, "./config");
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        // Save entities to config/entities.json
        const configPath = path.join(configDir, "entities.json");
        fs.writeFileSync(
            configPath,
            JSON.stringify({
                network: process.env.NETWORK_RPC_URL,
                entryPoint: entryPointAddress,
                entities,
            }, null, 2)
        );

        console.log(`
Configuration saved to ${configPath}`);
        console.log(`Successfully deployed ${entities.length} Smart Accounts`);

    } catch (error) {
        console.error("Failed to deploy Smart Accounts:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
