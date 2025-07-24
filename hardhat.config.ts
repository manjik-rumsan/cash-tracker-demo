import { HardhatUserConfig, vars } from 'hardhat/config';
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
const DEPLOYER_KEY: string = vars.get('DEPLOYER_KEY');
const ETHERSCAN_API_KEY:string= vars.get('ETHERSCAN_API_KEY') || '


const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      hardfork: "cancun"
    },
    "base-sepolia": {
      url: "https://sepolia.base.org",
      accounts: [DEPLOYER_KEY || ""],
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ETHERSCAN_API_KEY || "",
  },
  sourcify: {

    enabled: true
  }
};

export default config;
