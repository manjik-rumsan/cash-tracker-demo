import { HardhatUserConfig, vars } from 'hardhat/config';
import "@nomicfoundation/hardhat-toolbox";
const DEPLOYER_KEY: string = vars.get('DEPLOYER_KEY');


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

};

export default config;
