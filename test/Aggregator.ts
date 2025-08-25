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
    const [owner,account1,account2,account3, otherAccount] = await hre.ethers.getSigners();

    // Deploy SmartAccount
    const SmartAccountFactory = await hre.ethers.getContractFactory("SmartAccount");
    const smartAccount = await SmartAccountFactory.deploy(entryPoint.target);
    const smartAccount1 = await SmartAccountFactory.connect(account1).deploy(entryPoint.target);
    const smartAccount2 = await SmartAccountFactory.connect(account2).deploy(entryPoint.target);
    const smartAccount3 = await SmartAccountFactory.connect(account3).deploy(entryPoint.target);

    console.log("TARGET",smartAccount.target, smartAccount1.target);
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

});
