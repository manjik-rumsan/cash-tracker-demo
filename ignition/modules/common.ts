import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


const SmartAccountModule = buildModule("SmartAccount", (m) => {

  const cashToken = m.contract("CashToken", ["Cash Token", "CASH", 18, 1000n]);  
  const entryPoint = m.contract("EntryPoint");

  return {  entryPoint, cashToken };
});

export default SmartAccountModule;
