import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AggregatorModule = buildModule("Aggregator", (m) => {
  const aggregator = m.contract("Aggregator", []);

  return { aggregator };
});

export default AggregatorModule;
