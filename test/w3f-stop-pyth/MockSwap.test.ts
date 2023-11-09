import hre from "hardhat";
import { Signer } from "@ethersproject/abstract-signer";
import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";

import { setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { MockSwap } from "../../typechain";
import { Contract, utils } from "ethers";
import { IPyth } from "../../typechain";
import { pythAbi } from "../../web3-functions/w3f-stop-pyth/pythAbi";

const { ethers, deployments } = hre;

describe("MockSwap contract tests", function () {
  let admin: Signer; // proxyAdmin
  let adminAddress: string;
  let mockSwap: MockSwap;
  let gelatoMsgSenderSigner: Signer;
  let pythContract: IPyth;

  beforeEach(async function () {
    if (hre.network.name !== "hardhat") {
      console.error("Test Suite is meant to be run on hardhat only");
      process.exit(1);
    }

    await deployments.fixture();

    [admin] = await ethers.getSigners();

    adminAddress = await admin.getAddress();
    await setBalance(adminAddress, ethers.utils.parseEther("1000"));

    const { gelatoMsgSender: gelatoMsgSender, pyth: pythNetworkAddress } =
    await hre.getNamedAccounts();
    pythContract = new Contract(pythNetworkAddress, pythAbi, admin) as IPyth;


    gelatoMsgSenderSigner = await ethers.getSigner(gelatoMsgSender);
    await setBalance(gelatoMsgSender, utils.parseEther("10000000000000"));
    mockSwap = (await ethers.getContractAt(
      "MockSwap",
      (
        await deployments.get("MockSwap")
      ).address
    )) as MockSwap;

  });
  it("MockSwap.deposit: operator", async () => {
    
    await expect (mockSwap.connect(gelatoMsgSenderSigner).deposit(adminAddress,1000)).to.be.revertedWith("MockSwap.swap not allowed")

    await mockSwap.setOperator(await gelatoMsgSenderSigner.getAddress())

    await expect (mockSwap.connect(gelatoMsgSenderSigner).deposit(adminAddress,1000)).not.to.be.reverted;

  });


  it("MockSwap.swap: usdc-> weth & weth-usdc", async () => {

    await mockSwap.setOperator(await gelatoMsgSenderSigner.getAddress())
    await mockSwap.connect(gelatoMsgSenderSigner).deposit(adminAddress,100000)


    // Arbitrary bytes array
    const connection = new EvmPriceServiceConnection(
      "https://xc-testnet.pyth.network"
    );
    const priceIds = [
      "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6", // ETH/USD price id in testnet
    ];
    const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds);
    await pythContract.updatePriceFeeds(priceUpdateData,{value:1})


    let price = await pythContract.getPriceUnsafe(priceIds[0])
    let amount = Math.floor(100000*10**14/+price.price.toString())

    let balanceByUser = await mockSwap.balanceByUser(adminAddress)
  

    await mockSwap.swap(adminAddress,true)
    balanceByUser = await mockSwap.balanceByUser(adminAddress)
    expect (balanceByUser[1].toString()).equal(amount.toString())


    await mockSwap.swap(adminAddress,false)
    balanceByUser = await mockSwap.balanceByUser(adminAddress)
   
  });


});
