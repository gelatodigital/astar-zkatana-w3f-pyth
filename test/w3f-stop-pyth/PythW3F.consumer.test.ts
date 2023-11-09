import { expect } from "chai";
import { Wallet, Provider, Contract } from "zksync-web3";
import hre, { deployments, ethers, w3f } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import { Web3FunctionResultV2 } from "@gelatonetwork/web3-functions-sdk/*";
import {
  setBalance,
} from "@nomicfoundation/hardhat-network-helpers";
import { Signer, utils } from "ethers";
import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";
import { MockSwap, IPyth } from "../../typechain";
import { pythAbi } from "../../web3-functions/w3f-stop-pyth/pythAbi";

let admin: Signer; // proxyAdmin
let adminAddress: string;
let mockSwap: MockSwap;
let pythContract: IPyth;

describe("MockSwap W3F", function () {
  it("Should run as expected", async function () {
    await deployments.fixture();

    [admin] = await ethers.getSigners();

    adminAddress = await admin.getAddress();
    await setBalance(adminAddress, ethers.utils.parseEther("1000"));

    const { gelatoMsgSender: gelatoMsgSender, pyth: pythNetworkAddress } =
      await hre.getNamedAccounts();
    pythContract = new Contract(pythNetworkAddress, pythAbi, admin) as IPyth;

 
    await setBalance(gelatoMsgSender, utils.parseEther("10000000000000"));
    mockSwap = (await ethers.getContractAt(
      "MockSwap",
      (
        await deployments.get("MockSwap")
      ).address
    )) as MockSwap;

    let userPair = await mockSwap.balanceByUser(adminAddress);

    /// W3F First run 
    const mockSwapW3f = w3f.get("w3f-stop-pyth");

    let userArgs = {
      user: adminAddress,
      mockSwapAddress: mockSwap.address,
      pythNetworkAddress: pythNetworkAddress,
      priceIds: [
        "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6",
      ],
    };

    let storage = {
      lastMax: "0",
    };
    let w3f0 = await mockSwapW3f.run({ userArgs, storage });
    let result0 = w3f0.result as {
      canExec: false;
      message: string;
    };

    //// No active Trade available
    expect(result0.canExec).false;
    expect(result0.message).equal("No Active Trade");
    console.log(
      "\x1b[32m%s\x1b[0m",
      "    ✔",
      `\x1b[30m#First run 'No Active Trade'`
    );


    /// Creating Trade
    const depositValue = 10000 * 10 ** 6;
    const depositTx = await mockSwap.deposit(adminAddress, depositValue);
    await depositTx.wait();

    userPair = await mockSwap.balanceByUser(adminAddress);

    expect(userPair.usdc).equal(depositValue);

    // Arbitrary bytes array
    const connection = new EvmPriceServiceConnection(
      "https://xc-testnet.pyth.network"
    );
    const priceIds = [
      "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6", // ETH/USD price id in testnet
    ];

    const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds);
    await pythContract.updatePriceFeeds(priceUpdateData, { value: 1 });

    let price = await pythContract.getPriceUnsafe(priceIds[0])
    await mockSwap.swap(adminAddress, true);
    userPair = await mockSwap.balanceByUser(adminAddress);
    expect(userPair.usdc).equal(0);

    console.log(
      "\x1b[32m%s\x1b[0m",
      "    ✔",
      `\x1b[30m#Trade Created`
    );

    let w3f1 = await mockSwapW3f.run({ userArgs, storage });
    let result1 = w3f1.result as {
      canExec: false;
      message: string;
    };

    //// Funcition 2nd run initializing
    expect(result1.canExec).false;
    expect(result1.message).equal("Initiatig Price Exit");
    console.log(
      "\x1b[32m%s\x1b[0m",
      "    ✔",
      `\x1b[30m#W3F price initialized`
    );


    /// Price Go down 50%
    storage.lastMax = price.price.mul(2).toString()


    let w3f2 = await mockSwapW3f.run({ userArgs, storage });
    let result2 = w3f2.result as Web3FunctionResultV2;
    console.log(
      "\x1b[32m%s\x1b[0m",
      "    ✔",
      `\x1b[30m#W3F should execute Price down by 50%`
    );
 

    expect(result2.canExec).to.equal(true);

    if (result2.canExec == true) {
      const data = result2.callData[0];

      let w3fTx = await admin.sendTransaction({
        to: data.to,
        data: data.data,
        value:data.value
      });
      console.log(
        "\x1b[32m%s\x1b[0m",
        "    ✔",
        `\x1b[30m#Price Updated`
      );

      userPair = await mockSwap.balanceByUser(adminAddress);


      await w3fTx.wait();
      const dataSwap = result2.callData[1];
      let w3fSwapTx = await admin.sendTransaction({
        to: dataSwap.to,
        data: dataSwap.data,
      });

      await w3fSwapTx.wait();
      userPair = await mockSwap.balanceByUser(adminAddress);

      expect(userPair.weth).equal(0)
      console.log(
        "\x1b[32m%s\x1b[0m",
        "    ✔",
        `\x1b[30m#Exit trade`
      );

    }
  });
});
