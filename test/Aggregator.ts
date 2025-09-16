import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Aggregator with SmartAccount", function () {
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
    const Aggregator = await hre.ethers.getContractFactory("Aggregator");
    const aggregator = await Aggregator.deploy();
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

    return { entryPoint, entity1SmartAccount, entity2SmartAccount, entity3SmartAccount, cashToken, entity1, entity2, entity3, owner, otherAccount, aggregator, initialSupply };
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

    it("Should fetch balances from aggregator", async function () {
      const { cashToken, owner, initialSupply, entity1SmartAccount, entity2SmartAccount, entity3SmartAccount, aggregator } = await loadFixture(deployFixture);
      expect(await cashToken.balanceOf(owner.address)).to.equal(initialSupply);
      await cashToken.connect(owner).mint(entity1SmartAccount.target, 100n);
      await cashToken.connect(owner).mint(entity2SmartAccount.target, 200n);
      await cashToken.connect(owner).mint(entity3SmartAccount.target, 300n);
    expect(await aggregator.getBalances(cashToken.target, [entity1SmartAccount.target, entity2SmartAccount.target, entity3SmartAccount.target])).
    to.deep.equal([[entity1SmartAccount.target,100n], [entity2SmartAccount.target,200n], [entity3SmartAccount.target,300n]]);
  });



  describe("Fetch Approvals", async function () {
    let entity1SmartAccount:any, entity2SmartAccount:any, entity3SmartAccount:any, entity1:any, entity2:any, cashToken:any, owner:any, otherAccount:any, aggregator:any;
     before(async function () {
       const fixture = await loadFixture(deployFixture);
        entity1SmartAccount = fixture.entity1SmartAccount; 
        entity2SmartAccount = fixture.entity2SmartAccount;
        entity3SmartAccount = fixture.entity3SmartAccount;
        entity1 = fixture.entity1;
        entity2 = fixture.entity2;
        cashToken = fixture.cashToken;
        owner = fixture.owner;
        otherAccount = fixture.otherAccount;
        aggregator = fixture.aggregator;

        });


    it("Should fetch allowances of the entities", async function () {

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

          expect(await aggregator.getBalances(cashToken.target, [entity1SmartAccount.target, entity2SmartAccount.target, entity3SmartAccount.target])).
    to.deep.equal([[entity1SmartAccount.target,100n], [entity2SmartAccount.target,0], [entity3SmartAccount.target,0]]);

      // Verify the approval was successful
      expect(await aggregator
        .getSerialAllowances(cashToken.target,[entity1SmartAccount.target, entity2SmartAccount.target,entity3SmartAccount.target]))
        .to.deep.equal([[
         entity1SmartAccount.target,
         entity2SmartAccount.target,
      50n
        ],
        [
         entity2SmartAccount.target,
         entity3SmartAccount.target,
      0n
        ]]
      );
      expect(await cashToken.allowance(entity1SmartAccount.target, entity2SmartAccount.target)).to.equal(50n);
      expect(await cashToken.balanceOf(entity1SmartAccount.target)).to.equal(100n);
    });

  });
});
});