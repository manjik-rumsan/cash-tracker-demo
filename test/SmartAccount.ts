import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("SmartAccount Test", function () {
  // Define a fixture to reuse the same setup in every test
  async function deployFixture() {
    // Deploy EntryPoint
    const EntryPointFactory = await hre.ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPointFactory.deploy();
    
    // Get signers
    const [owner, otherAccount] = await hre.ethers.getSigners();

    // Deploy SmartAccount
    const SmartAccountFactory = await hre.ethers.getContractFactory("SmartAccount");
    const smartAccount = await SmartAccountFactory.deploy(entryPoint.target);
    
    // Fund the smart account
    await owner.sendTransaction({
      to: smartAccount.target,
      value: hre.ethers.parseEther("1.0"), // Send 1 ETH to the smart account
    });
    
    // Deploy CashToken
    const initialSupply = 1000n;
    const CashTokenFactory = await hre.ethers.getContractFactory("CashToken");
    const cashToken = await CashTokenFactory.connect(owner).deploy(
      "Cash Token",
      "CASH",
      18,
      initialSupply
    );
    
    return { entryPoint, smartAccount, cashToken, owner, otherAccount, initialSupply };
  }

  describe("Deployment", function () {
    it("Should set the right owner for SmartAccount", async function () {
      const { smartAccount, owner } = await loadFixture(deployFixture);
      expect(await smartAccount.owner()).to.equal(owner.address);
    });

    it("Should set the right EntryPoint", async function () {
      const { smartAccount, entryPoint } = await loadFixture(deployFixture);
      expect(await smartAccount.getEntryPoint()).to.equal(entryPoint);
    });

    it("Should have the correct initial supply for CashToken", async function () {
      const { cashToken, owner, initialSupply } = await loadFixture(deployFixture);
      expect(await cashToken.balanceOf(owner.address)).to.equal(initialSupply * (10n ** 18n));
    });

  });

  describe("Execute", function () {
    it("Should allow owner to execute a CashToken transfer directly", async function () {
      const { smartAccount, cashToken, owner, otherAccount } = await loadFixture(deployFixture);

      // Transfer tokens to smart account
      const transferAmount = 100n * (10n ** 18n);
      await cashToken.connect(owner).transfer(smartAccount, transferAmount);
      
      // Verify smart account received tokens
      expect(await cashToken.balanceOf(smartAccount)).to.equal(transferAmount);
      
      // Encode the function call to transfer tokens from smart account to another account
      const transferCallData = cashToken.interface.encodeFunctionData("transfer", [
        otherAccount.address,
        1n * (10n ** 18n)
      ]);

      // Execute the transfer through the smart account
      await smartAccount.connect(owner).execute(
        cashToken,
        0, // No value sent
        transferCallData
      );

      // Verify the transfer was successful
      expect(await cashToken.balanceOf(otherAccount.address)).to.equal(1n * (10n ** 18n));
      expect(await cashToken.balanceOf(smartAccount.target)).to.equal(99n * (10n ** 18n));
    });

    it("Should revert when non-owner tries to execute a transaction directly", async function () {
      const { smartAccount, cashToken, otherAccount } = await loadFixture(deployFixture);

      // Encode the function call to transfer tokens
      const transferCallData = cashToken.interface.encodeFunctionData("transfer", [
        otherAccount.address,
        50n * (10n ** 18n)
      ]);

      // Try to execute the transfer through the smart account with a non-owner
      await expect(
        smartAccount.connect(otherAccount).execute(
          cashToken,
          0, // No value sent
          transferCallData
        )
      ).to.be.revertedWithCustomError(smartAccount, "SmartAccount__NotFromEntryPointOrOwner");
    });
  });

  // describe("UserOp via EntryPoint", function () {
  //   it("Should execute a CashToken transfer via UserOperation", async function () {
  //     const { entryPoint, smartAccount, cashToken, owner, otherAccount } = await loadFixture(deployFixture);

  //     // Transfer tokens to smart account
  //     const transferAmount = 100n * (10n ** 18n);
  //     await cashToken.connect(owner).transfer(smartAccount, transferAmount);
      
  //     // Verify smart account received tokens
  //     expect(await cashToken.balanceOf(smartAccount)).to.equal(transferAmount);

  //     // Encode the function call to transfer tokens from smart account to another account
  //     const transferCallData = cashToken.interface.encodeFunctionData("transfer", [
  //       otherAccount.address,
  //       50n * (10n ** 18n)
  //     ]);

  //     // Encode the execute function call for the smart account
  //     const smartAccountCallData = smartAccount.interface.encodeFunctionData("execute", [
  //       cashToken,
  //       0, // No value sent
  //       transferCallData,
  //     ]);

  //     // Create packed values for gas limits and fees
  //     const verificationGasLimit = 500000n;
  //     const callGasLimit = 500000n;
  //     const maxFeePerGas = 10000000000n; // 10 Gwei
  //     const maxPriorityFeePerGas = 1000000000n; // 1 Gwei
      
  //     const accountGasLimits = hre.ethers.solidityPacked(
  //       ["uint128", "uint128"], 
  //       [verificationGasLimit, callGasLimit]
  //     );
      
  //     const gasFees = hre.ethers.solidityPacked(
  //       ["uint256", "uint256"],
  //       [maxFeePerGas, maxPriorityFeePerGas]
  //     );

  //     // Create a UserOperation
  //     const packedUserOp = {
  //       sender: smartAccount,
  //       nonce: 0n, // First transaction
  //       initCode: "0x", // No init code for existing account
  //       callData: smartAccountCallData,
  //       accountGasLimits,
  //       preVerificationGas: 50000n,
  //       gasFees,
  //       paymasterAndData: "0x", // No paymaster
  //       signature: "0x",
  //     };

  //     // Get the user op hash from the EntryPoint contract
  //     const userOpHash = await entryPoint.getUserOpHash(packedUserOp);
      
  //     // Sign the message hash
  //     const signature = await owner.signMessage(hre.ethers.getBytes(userOpHash));
  //     packedUserOp.signature = signature;

  //     // Set up beneficiary (can be any address)
  //     const beneficiary = otherAccount.address;
      
  //     // Execute the UserOp through the EntryPoint
  //     await entryPoint.handleOps([packedUserOp], beneficiary);

  //     // Verify the transfer was successful
  //     expect(await cashToken.balanceOf(otherAccount.address)).to.equal(50n * (10n ** 18n));
  //     expect(await cashToken.balanceOf(smartAccount)).to.equal(50n * (10n ** 18n));
  //   });
  // });
});
