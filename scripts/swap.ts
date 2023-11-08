
import * as ethers from "ethers";
import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";
// load env file
import dotenv from "dotenv";
dotenv.config();

// load contract artifact. Make sure to compile first!
import { IPyth, MockSwap } from "../typechain";
import * as MockSwapArtifact from "../artifacts/contracts/MockSwap.sol/MockSwap.json";
import { pythAbi } from "../web3-functions/w3f-stop-pyth/pythAbi";
import { parseEther } from "ethers/lib/utils";
import hre from "hardhat";
const PK = process.env.PK || "";

if (!PK) throw "⛔️ Private key not detected! Add it to the .env file!";

// Address of the contract on zksync testnet
const CONTRACT_ADDRESS = "0x957ce2D8e9E0F584000FbEA2b655e939BE5dfD52";

if (!CONTRACT_ADDRESS) throw "⛔️ Contract address not provided";

// An example of a deploy script that will deploy and call a simple contract.
const swwap =  async  () => {
  console.log(`Running script to interact with contract ${CONTRACT_ADDRESS}`);

  // Initialize the provider.
  // @ts-ignore
  const provider = hre.ethers.provider
  const signer = new ethers.Wallet(PK, provider);

  // Initialize contract instance
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    MockSwapArtifact.abi,
    signer
  ) as MockSwap;

  let pythContract = new ethers.Contract(
    "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729",
    pythAbi,
    signer
  ) as IPyth;
  // Update Price
  // Arbitrary bytes array
  const connection = new EvmPriceServiceConnection(
    "https://xc-testnet.pyth.network"
  );
  const priceIds = [
    "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6", // ETH/USD price id in testnet
  ];
  const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds);
  await pythContract.updatePriceFeeds(priceUpdateData, { value: 1 });

  // send transaction to update the message
  const tx2 = await contract.swap(
    "0xB65540bBA534E88EB4a5062D0E6519C07063b259",
    true
  );
  await tx2.wait();

  // Read message after transaction
}

swwap()