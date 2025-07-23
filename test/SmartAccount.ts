import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { EntryPoint, SmartAccount, Lock } from "../typechain-types";

describe("SmartAccount", function () {
  // Define a fixture to reuse the same setup in every test
  async function deploySmartAccountFixture() {
    // Deploy EntryPoint
    const EntryPointFactory = await hre.ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPointFactory.deploy();

    // Deploy SmartAccount
    const [owner, otherAccount] = await hre.ethers.getSigners();
    const SmartAccountFactory = await hre.ethers.getContractFactory("SmartAccount");
    const smartAccount = await SmartAccountFactory.deploy(entryPoint.target);

    // Fund the smart account
    await owner.sendTransaction({
      to: smartAccount.target,
      value: hre.ethers.parseEther("1.0"), // Send 1 ETH to the smart account
    });

    // Deploy Lock
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;
    const lockedAmount = hre.ethers.parseEther("0.1");
    const LockFactory = await hre.ethers.getContractFactory("Lock");
    const lock = await LockFactory.deploy(unlockTime, { value: lockedAmount });

    return { entryPoint, smartAccount, lock, owner, otherAccount, unlockTime, lockedAmount };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { smartAccount, owner } = await loadFixture(deploySmartAccountFixture);
      expect(await smartAccount.owner()).to.equal(owner.address);
    });

    it("Should set the right EntryPoint", async function () {
      const { smartAccount, entryPoint } = await loadFixture(deploySmartAccountFixture);
      expect(await smartAccount.getEntryPoint()).to.equal(entryPoint.target);
    });
  });

  describe("Execute", function () {
    it("Should allow owner to execute a transaction", async function () {
      const { smartAccount, lock, owner } = await loadFixture(deploySmartAccountFixture);

      // Encode the function call to get the unlockTime
      const callData = lock.interface.encodeFunctionData("unlockTime");

      // Execute the call through the smart account
      await smartAccount.connect(owner).execute(
        lock.target,
        0, // No value sent
        callData
      );

      // We don't need to verify the result here, as we're just checking that the call doesn't revert
    });

    it("Should revert when non-owner tries to execute a transaction directly", async function () {
      const { smartAccount, lock, otherAccount } = await loadFixture(deploySmartAccountFixture);

      // Encode the function call to get the unlockTime
      const callData = lock.interface.encodeFunctionData("unlockTime");

      // Try to execute the call through the smart account with a non-owner
      await expect(
        smartAccount.connect(otherAccount).execute(
          lock.target,
          0, // No value sent
          callData
        )
      ).to.be.revertedWithCustomError(smartAccount, "SmartAccount__NotFromEntryPointOrOwner");
    });
  });

  describe("UserOp via EntryPoint", function () {
    it("Should execute a transaction via UserOperation", async function () {
      const { entryPoint, smartAccount, lock, owner, otherAccount } = await loadFixture(deploySmartAccountFixture);

      // Encode the function call to get the unlockTime
      const callData = lock.interface.encodeFunctionData("unlockTime");

      // Encode the execute function call for the smart account
      const smartAccountCallData = smartAccount.interface.encodeFunctionData("execute", [
        lock.target,
        0, // No value sent
        callData,
      ]);

      // Create the packed user operation
      const smartAccountAddress = smartAccount.target;
      
      // Create packed values for gas limits and fees
      const verificationGasLimit = 500000n;
      const callGasLimit = 500000n;
      const maxFeePerGas = 10000000000n; // 10 Gwei
      const maxPriorityFeePerGas = 1000000000n; // 1 Gwei
      
      const accountGasLimits = hre.ethers.solidityPacked(
        ["uint128", "uint128"], 
        [verificationGasLimit, callGasLimit]
      );
      
      const gasFees = hre.ethers.solidityPacked(
        ["uint256", "uint256"],
        [maxFeePerGas, maxPriorityFeePerGas]
      );

      // Create a UserOperation
      const packedUserOp = {
        sender: smartAccountAddress,
        nonce: 0, // First transaction
        initCode: "0x", // No init code for existing account
        callData: smartAccountCallData,
        accountGasLimits,
        preVerificationGas: 50000n,
        gasFees,
        paymasterAndData: "0x", // No paymaster
        signature: "0x",
      };

      // Get the user op hash from the EntryPoint contract
      const userOpHash = await entryPoint.getUserOpHash(packedUserOp);
      console.log("UserOp Hash:", userOpHash);
      // Sign the message hash
      const signature = await owner.signMessage(hre.ethers.getBytes(userOpHash));
      packedUserOp.signature = signature;

      // Set up beneficiary (can be any address)
      const beneficiary = otherAccount.address;
      console.log({packedUserOp,beneficiary})
      // Execute the UserOp through the EntryPoint
      await entryPoint.handleOps([packedUserOp], beneficiary);

      // We don't verify the result here as we're just checking that the operation doesn't revert
    });

    // it("Should allow the smart account to call Lock contract functions via UserOperation", async function () {
    //   const { entryPoint, smartAccount, lock, owner, otherAccount, unlockTime } = await loadFixture(deploySmartAccountFixture);

    //   // We need to increase time to be able to withdraw
    //   await time.increaseTo(unlockTime);

    //   // Encode the function call to withdraw
    //   const lockCallData = lock.interface.encodeFunctionData("withdraw");

    //   // Encode the execute function call for the smart account
    //   const smartAccountCallData = smartAccount.interface.encodeFunctionData("execute", [
    //     lock.target,
    //     0, // No value sent
    //     lockCallData,
    //   ]);

    //   // Create the packed user operation
    //   const smartAccountAddress = smartAccount.target;
      
    //   // Create packed values for gas limits and fees
    //   const verificationGasLimit = 500000n;
    //   const callGasLimit = 500000n;
    //   const maxFeePerGas = 10000000000n; // 10 Gwei
    //   const maxPriorityFeePerGas = 1000000000n; // 1 Gwei
      
    //   const accountGasLimits = hre.ethers.solidityPacked(
    //     ["uint128", "uint128"], 
    //     [verificationGasLimit, callGasLimit]
    //   );
      
    //   const gasFees = hre.ethers.solidityPacked(
    //     ["uint256", "uint256"],
    //     [maxFeePerGas, maxPriorityFeePerGas]
    //   );

    //   // Create a UserOperation
    //   const packedUserOp = {
    //     sender: smartAccountAddress,
    //     nonce: 0, // First transaction
    //     initCode: "0x", // No init code for existing account
    //     callData: smartAccountCallData,
    //     accountGasLimits,
    //     preVerificationGas: 50000n,
    //     gasFees,
    //     paymasterAndData: "0x", // No paymaster
    //     signature: "0x",
    //   };

    //   // Get the user op hash from the EntryPoint contract
    //   const userOpHash = await entryPoint.getUserOpHash(packedUserOp);

    //   // Sign the message hash
    //   const signature = await owner.signMessage(hre.ethers.getBytes(userOpHash));
    //   packedUserOp.signature = signature;

    //   // Check lock balance before withdrawal
    //   const initialLockBalance = await hre.ethers.provider.getBalance(lock.target);
    //   expect(initialLockBalance).to.be.gt(0);

    //   // Execute the UserOp through the EntryPoint
    //   await entryPoint.handleOps([packedUserOp], otherAccount.address);

    //   // Check lock balance after withdrawal
    //   const finalLockBalance = await hre.ethers.provider.getBalance(lock.target);
    //   expect(finalLockBalance).to.equal(0);
    // });
  });
});
