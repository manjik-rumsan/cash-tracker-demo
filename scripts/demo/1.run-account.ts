import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import entities from "./config/entities.json";
import inquirer from 'inquirer';

// ABI imports
const SmartAccountArtifact = require("../../artifacts/contracts/SmartAccount.sol/SmartAccount.json");
const CashTokenArtifact = require("../../artifacts/contracts/CashToken.sol/CashToken.json");

// Menu options
const OPERATIONS = {
    CHECK_BALANCE: 'Check CashToken balance',
    APPROVE_TOKENS: 'Approve tokens',
    CHECK_ALLOWANCE: 'Check allowance',
    TRANSFER_FROM: 'Transfer approved tokens (transferFrom)',
    SWITCH_ACCOUNT: 'Switch Account',
    EXIT: 'Exit'
} as const;

async function main() {
    // Setup provider
    const provider = new ethers.JsonRpcProvider(entities.network);
    
    // CashToken contract address - replace with your deployed address
    const cashTokenAddress = "0xc3E3282048cB2F67b8e08447e95c37f181E00133"; // TODO: Replace this

    // Setup instances
    const cashToken = new ethers.Contract(
        cashTokenAddress,
        CashTokenArtifact.abi,
        provider
    );

    // Utility function to print token balance
    async function printBalance(address: string, label: string) {
        console.log('checking balance for', address);
        const balance = await cashToken.balanceOf(address);
        const decimalPlaces = await cashToken.decimals();
        console.log(`${label} balance:`, ethers.formatUnits(balance, decimalPlaces), "CASH");
    }

    // Utility function to select an entity
    async function selectEntity(message: string): Promise<{
        entity: typeof entities.entities[0],
        wallet: ethers.Wallet,
        smartAccount: ethers.Contract
    }> {
        const choices = entities.entities.map((e, i) => ({
            name: `Smart Account: ${e.smartAccount}`,
            value: i
        }));

        const { selectedIndex } = await inquirer.prompt([{
            type: 'list',
            name: 'selectedIndex',
            message,
            choices
        }]);

        const entity = entities.entities[selectedIndex];
        const wallet = new ethers.Wallet(entity.privateKey, provider);
        const smartAccount = new ethers.Contract(
            entity.smartAccount,
            SmartAccountArtifact.abi,
            wallet
        );

        return { entity, wallet, smartAccount };
    }

    try {
        console.log("\n=== Smart Account Selection ===");
        let activeAccount = await selectEntity("Select the Smart Account you want to operate with: ");
        console.log(`\nSelected Smart Account: ${activeAccount.entity.smartAccount}`);
        
        while (true) {
            await printBalance(activeAccount.entity.smartAccount, "Current Account");
            
            const { operation } = await inquirer.prompt([{
                type: 'list',
                name: 'operation',
                message: 'Select an operation:',
                choices: Object.values(OPERATIONS)
            }]);

            if (operation === OPERATIONS.EXIT) {
                console.log("Exiting...");
                break;
            }

            if (operation === OPERATIONS.SWITCH_ACCOUNT) {
                activeAccount = await selectEntity("Select new account to operate with: ");
                console.log(`\nSwitched to Smart Account: ${activeAccount.entity.smartAccount}`);
                continue;
            }

            switch (operation) {
                case OPERATIONS.CHECK_BALANCE: {
                    await printBalance(activeAccount.entity.smartAccount, "Current SmartAccount");
                    break;
                }

                case OPERATIONS.APPROVE_TOKENS: {
                    const spender = (await selectEntity("Select account to approve tokens for: ")).entity.smartAccount;
                    
                    const { amount } = await inquirer.prompt([{
                        type: 'input',
                        name: 'amount',
                        message: 'Enter amount to approve (in CASH tokens):',
                        validate: (value) => !isNaN(Number(value)) || 'Please enter a valid number'
                    }]);
                    
                    const approveAmount = ethers.parseEther(amount);
                    
                    console.log("Approving tokens for:", spender);
                    const approveTx = await activeAccount.smartAccount.execute(
                        cashTokenAddress,
                        0,
                        cashToken.interface.encodeFunctionData("approve", [spender, approveAmount])
                    );
                    await approveTx.wait();
                    console.log("Approval transaction completed");
                    break;
                }

                case OPERATIONS.CHECK_ALLOWANCE: {
                    const spender = (await selectEntity("Select spender account: ")).entity.smartAccount;
                    const allowance = await cashToken.allowance(activeAccount.entity.smartAccount, spender);
                    console.log("Current allowance:", ethers.formatEther(allowance), "CASH");
                    break;
                }

                case OPERATIONS.TRANSFER_FROM: {
                    // For transferFrom, we use the active account as the spender (who executes transferFrom)
                    const { entity: fromEntity } = await selectEntity("Select account to transfer FROM: ");
                    const { entity: toEntity } = await selectEntity("Select account to transfer TO: ");
                    
                    const { amount } = await inquirer.prompt([{
                        type: 'input',
                        name: 'amount',
                        message: 'Enter amount to transfer (in CASH tokens):',
                        validate: (value) => !isNaN(Number(value)) || 'Please enter a valid number'
                    }]);
                    
                    const transferAmount = ethers.parseEther(amount);

                    console.log("\nTransferring tokens using transferFrom...");
                    const transferFromTx = await activeAccount.smartAccount.execute(
                        cashTokenAddress,
                        0,
                        cashToken.interface.encodeFunctionData("transferFrom", [
                            fromEntity.smartAccount,
                            toEntity.smartAccount,
                            transferAmount
                        ])
                    );
                    await transferFromTx.wait();
                    console.log("TransferFrom completed");

                    // Print final balances
                    console.log("\nFinal balances:");
                    await printBalance(fromEntity.smartAccount, "From Account");
                    await printBalance(toEntity.smartAccount, "To Account");
                    break;
                }
            }

            await inquirer.prompt([{
                type: 'input',
                name: 'continue',
                message: 'Press Enter to continue...'
            }]);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
