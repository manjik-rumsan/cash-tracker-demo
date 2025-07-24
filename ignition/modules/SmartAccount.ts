import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


const SmartAccountModule = buildModule("SmartAccount", (m) => {

  const smartAccount = m.contract("SmartAccount", ["0x1e2717BC0dcE0a6632fe1B057e948ec3EF50E38b"]);

  return { smartAccount};
});

export default SmartAccountModule;
