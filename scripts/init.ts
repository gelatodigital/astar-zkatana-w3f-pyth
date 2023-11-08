
import * as ethers from "ethers";


// load env file
import dotenv from "dotenv";
dotenv.config();

// load contract artifact. Make sure to compile first!
import { MockSwap } from "../typechain";
import * as  MockSwapArtifact from "../artifacts/contracts/MockSwap.sol/MockSwap.json"
import hre from "hardhat";

const PK = process.env.PK || "";

if (!PK)
  throw "⛔️ Private key not detected! Add it to the .env file!";

// Address of the contract on zksync testnet
const CONTRACT_ADDRESS = "0x957ce2D8e9E0F584000FbEA2b655e939BE5dfD52";

if (!CONTRACT_ADDRESS) throw "⛔️ Contract address not provided";

// An example of a deploy script that will deploy and call a simple contract.
const init = async () =>{
  console.log(`Running script to interact with contract ${CONTRACT_ADDRESS}`);

  // Initialize the provider.
  // @ts-ignore
  const provider = hre.ethers.provider
  const signer = new ethers.Wallet(PK, provider);

  console.log(signer.address)

  // Initialize contract instance
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    MockSwapArtifact.abi,
    signer
  ) as MockSwap; 



  // send transaction to deposit and set operator
  const deposit =  1000000000
  const tx = await contract.deposit("0xB65540bBA534E88EB4a5062D0E6519C07063b259",deposit)
  await tx.wait();
  console.log(`Deposited ${deposit} into ${CONTRACT_ADDRESS} in ${tx.hash} `);

  const tx2 = await contract.setOperator("0xbB97656cd5fECe3a643335d03C8919D5E7DcD225")
  await tx2.wait();
  console.log(`Transaction to set operator ${tx2.hash}`);
  

  // Read message after transaction
 
}

init()