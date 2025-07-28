import { ethers } from "ethers";
import entities from "./config/entities.json";
import inquirer from 'inquirer';

// ABI imports
const CashTokenArtifact = require("../../artifacts/contracts/CashToken.sol/CashToken.json");

// Function to clear console
function clearConsole() {
    console.clear();
}

async function main() {
    // Setup provider
    const provider = new ethers.JsonRpcProvider(entities.network);
    
    // CashToken contract address - replace with your deployed address
    const cashTokenAddress = "0xc3E3282048cB2F67b8e08447e95c37f181E00133";

    // Setup CashToken instance
    const cashToken = new ethers.Contract(
        cashTokenAddress,
        CashTokenArtifact.abi,
        provider
    );

    let isTracking = false;
    let refreshInterval = 5;

    async function trackBalances() {
        console.log("\n=== Token Balances ===");
        for (const entity of entities.entities) {
            const balance = await cashToken.balanceOf(entity.smartAccount);
            console.log(`${entity.smartAccount}: ${ethers.formatEther(balance)} CASH`);
        }
    }

    async function trackAllowances() {
        console.log("\n=== Token Allowances ===");
        // Check allowances between all accounts
        for (const owner of entities.entities) {
            console.log(`\nAllowances granted by ${owner.smartAccount}:`);
            for (const spender of entities.entities) {
                if (owner.smartAccount !== spender.smartAccount) {
                    const allowance = await cashToken.allowance(
                        owner.smartAccount,
                        spender.smartAccount
                    );
                    if (allowance > 0n) {
                        console.log(`  → To ${spender.smartAccount}: ${ethers.formatEther(allowance)} CASH`);
                    }
                }
            }
        }
    }

    async function displayStatus() {
        clearConsole();
        console.log(`
=== CashToken Tracker (Refreshing every ${refreshInterval} seconds) ===`);
        console.log("Press Ctrl+C to stop tracking\n");

        // Display balances
        console.log("=== Token Balances ===");
        for (const entity of entities.entities) {
            const balance = await cashToken.balanceOf(entity.smartAccount);
            console.log(`${entity.smartAccount}: ${ethers.formatEther(balance)} CASH`);
        }

        // Display allowances
        console.log("\n=== Token Allowances ===");
        for (const owner of entities.entities) {
            let hasAllowance = false;
            for (const spender of entities.entities) {
                if (owner.smartAccount !== spender.smartAccount) {
                    const allowance = await cashToken.allowance(
                        owner.smartAccount,
                        spender.smartAccount
                    );
                    if (allowance > 0n) {
                        if (!hasAllowance) {
                            console.log(`\nAllowances granted by ${owner.smartAccount}:`);
                            hasAllowance = true;
                        }
                        console.log(`  → To ${spender.smartAccount}: ${ethers.formatEther(allowance)} CASH`);
                    }
                }
            }
        }
    }

    async function startTracking() {
        isTracking = true;
        console.log(`Starting to track balances and allowances...`);
        
        while (isTracking) {
            await displayStatus();
            await new Promise(resolve => setTimeout(resolve, refreshInterval * 1000));
        }
    }

    const OPERATIONS = {
        START_POLLING: 'Start tracking balances and allowances (auto-refresh)',
        SHOW_ONCE: 'Show current balances and allowances once',
        CHANGE_INTERVAL: 'Change refresh interval',
        EXIT: 'Exit'
    } as const;

    let pollingInterval = 5000; // Default 5 seconds
    let isPolling = false;
    let pollTimer: NodeJS.Timer;

    // Function to clear screen and move cursor to top
    function clearScreen() {
        process.stdout.write('\x1Bc');
    }

    async function pollBalancesAndAllowances() {
        while (isPolling) {
            clearScreen();
            console.log(`\n=== Auto-refreshing every ${pollingInterval/1000} seconds ===`);
            console.log("Press Ctrl+C to stop and return to menu\n");
            
            await trackBalances();
            await trackAllowances();
            
            await new Promise(resolve => setTimeout(resolve, pollingInterval));
        }
    }

    try {
        while (true) {
            const { action } = await inquirer.prompt({
                type: 'list',
                name: 'action',
                message: 'Select an option:',
                choices: [
                    { name: 'Start tracking balances and allowances', value: 'track' },
                    { name: 'Change refresh interval', value: 'interval' },
                    { name: 'Exit', value: 'exit' }
                ]
            });

            if (action === 'exit') {
                console.log('Exiting...');
                break;
            }

            if (action === 'interval') {
                const { interval } = await inquirer.prompt({
                    type: 'number',
                    name: 'interval',
                    message: 'Enter refresh interval in seconds:',
                    default: refreshInterval
                });
                refreshInterval = Math.max(1, interval);
                console.log(`Refresh interval set to ${refreshInterval} seconds`);
                continue;
            }

            if (action === 'track') {
                await startTracking();
            }
        }

    } catch (error) {
        if (error instanceof Error) {
            console.error("Error:", error.message);
        } else {
            console.error("An unknown error occurred");
        }
    } finally {
        isTracking = false;
    }
}

// Handle Ctrl+C to gracefully exit
process.on('SIGINT', () => {
    console.log('\nStopping tracker...');
    process.exit(0);
});

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
