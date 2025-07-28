import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("CashTracker with SmartAccount", function () {
  // Define a fixture to reuse the same setup in every test
  async function deployFixture() {
    // Deploy EntryPoint
    const EntryPointFactory = await hre.ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPointFactory.deploy();
    const senderCreator = await entryPoint.senderCreator();
    console.log("EntryPoint Address:", entryPoint.target);
    console.log("senderCreator:", senderCreator);
    // Get signers
    const [owner,entity1,entity2,entity3, otherAccount] = await hre.ethers.getSigners();
    console.log("Owner Address:", owner.address);
    console.log("Entity1 Address:", entity1.address);
    console.log("Entity2 Address:", entity2.address);
    console.log("Entity3 Address:", entity3.address);
    // Deploy SmartAccount
    // const SmartAccountFactory = await hre.ethers.deployContract("SmartAccountFactory", [entryPoint.target]);
    const SmartAccountFactory  = await hre.ethers.getContractFactory("SmartAccount");
    console.log('SmartAccountFactory Address:', SmartAccountFactory.target);
    // Create Smart Accounts for entities

    const entity1SmartAccountAddress = await SmartAccountFactory.connect(entity1).deploy(entryPoint.target);
    const entity2SmartAccountAddress = await SmartAccountFactory.connect(entity2).deploy(entryPoint.target);
    const entity3SmartAccountAddress = await SmartAccountFactory.connect(entity3).deploy(entryPoint.target);

    const entity1SmartAccount = await hre.ethers.getContractAt("SmartAccount", entity1SmartAccountAddress);
    const entity2SmartAccount = await hre.ethers.getContractAt("SmartAccount", entity2SmartAccountAddress);
    const entity3SmartAccount = await hre.ethers.getContractAt("SmartAccount", entity3SmartAccountAddress);
    // Deploy CashToken
    const initialSupply = 1000n;
    const CashTokenFactory = await hre.ethers.getContractFactory("CashToken");
    const cashToken = await CashTokenFactory.connect(owner).deploy(
      "Cash Token",
      "CASH",
      0,
      initialSupply
    );

    return { entryPoint, entity1SmartAccount, entity2SmartAccount, entity3SmartAccount, cashToken, entity1, entity2, entity3, owner, otherAccount, initialSupply };
  }

  describe("Deployment", function () {
    it("Should set the right owner for SmartAccount", async function () {
      const { entity1SmartAccount, entity1 } = await loadFixture(deployFixture);
      expect(await entity1SmartAccount.owner()).to.equal(entity1.address);
    });

    it("Should set the right EntryPoint", async function () {
      const { entity1SmartAccount, entryPoint } = await loadFixture(deployFixture);
      expect(await entity1SmartAccount.getEntryPoint()).to.equal(entryPoint);
    });

    it("Should have the correct initial supply for CashToken", async function () {
      const { cashToken, owner, initialSupply } = await loadFixture(deployFixture);
      expect(await cashToken.balanceOf(owner.address)).to.equal(initialSupply);
    });

  });



  describe("Execute", async function () {
    let entity1SmartAccount:any, entity2SmartAccount:any, entity1:any, entity2:any, cashToken:any, owner:any, otherAccount:any;
     before(async function () {
       const fixture = await loadFixture(deployFixture);
        entity1SmartAccount = fixture.entity1SmartAccount; 
        entity2SmartAccount = fixture.entity2SmartAccount;
        entity1 = fixture.entity1;
        entity2 = fixture.entity2;
        cashToken = fixture.cashToken;
        owner = fixture.owner;
        otherAccount = fixture.otherAccount;

        });


    it("Should allow entity1 to approve cashToken transfer", async function () {

      await cashToken.connect(owner).mint(entity1SmartAccount, 100n);
      expect(await cashToken.balanceOf(entity1SmartAccount.target)).to.equal(100n);
      const approveCallData = cashToken.interface.encodeFunctionData("approve", [
        entity2SmartAccount.target,
        50n
      ]);

      // Execute the approve through the smart account
      const tx = await entity1SmartAccount.connect(entity1).execute(
        cashToken.target,
        0, // No value sent
        approveCallData
      );

      const balance =await cashToken.balanceOf(entity1SmartAccount.target)
      // Verify the transfer was successful
      expect(await cashToken.allowance(entity1SmartAccount.target, entity2SmartAccount.target)).to.equal(50n);
      expect(await cashToken.balanceOf(entity1SmartAccount.target)).to.equal(100n);
    });

    it("Should allow entity2 to get the tokens from entity1", async function () {


      // Encode the function call to transfer tokens
      const transferFromCallData = cashToken.interface.encodeFunctionData("transferFrom", [
        entity1SmartAccount.target,
        entity2SmartAccount.target,
        50n
      ]);

            // Execute the transfer through the smart account
      await entity2SmartAccount.connect(entity2).execute(
        cashToken.target,
        0, // No value sent
        transferFromCallData
      );

      expect(await cashToken.balanceOf(entity2SmartAccount.target)).to.equal(50n);
      expect(await cashToken.balanceOf(entity1SmartAccount.target)).to.equal(50n);

    });
  });

  // describe("UserOp via EntryPoint", function () {
  //   it("Should execute a CashToken transfer via UserOperation", async function () {
  //     const { entryPoint, smartAccount, cashToken, owner, otherAccount } = await loadFixture(deployFixture);

  //     // Transfer tokens to smart account
  //     const transferAmount = 100n;
  //     await cashToken.connect(owner).transfer(smartAccount, transferAmount);
      
  //     // Verify smart account received tokens
  //     expect(await cashToken.balanceOf(smartAccount)).to.equal(transferAmount);

  //     // Encode the function call to transfer tokens from smart account to another account
  //     const transferCallData = cashToken.interface.encodeFunctionData("transfer", [
  //       otherAccount.address,
  //       50n
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
  //     expect(await cashToken.balanceOf(otherAccount.address)).to.equal(50n);
  //     expect(await cashToken.balanceOf(smartAccount)).to.equal(50n);
  //   });
  // });
});
