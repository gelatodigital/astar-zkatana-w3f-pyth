import { HardhatUserConfig } from "hardhat/config";

// PLUGINS
import "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-deploy";

// Process Env Variables
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

const PK = process.env.PK;


// HardhatUserConfig bug
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: HardhatUserConfig = {
  // web3 functions
  w3f: {
    rootDir: "./web3-functions",
    debug: false,
    networks: [ "zKatana"], //(multiChainProvider) injects provider for these networks
  },
  // hardhat-deploy
  namedAccounts: {
    deployer: {
      default: 0,
    },
    gelatoMsgSender: {
      hardhat: "0xbB97656cd5fECe3a643335d03C8919D5E7DcD225",
      zKatana: "0xbB97656cd5fECe3a643335d03C8919D5E7DcD225",
    },
    pyth: {
      hardhat: "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729",
      zKatana: "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729",
    },
  },
  defaultNetwork: "zKatana",

  networks: {
    hardhat: {
      forking: {
        url: `https://rpc.zkatana.gelato.digital`,
        blockNumber: 80000,
      },
    },

    zKatana: {
      accounts: PK ? [PK] : [],
      chainId: 1261120,
      url: `https://rpc.zkatana.gelato.digital`,
    },
  },

  solidity: {
    compilers: [
      {
        version: "0.8.18",
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
    ],
  },

  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },

  // hardhat-deploy
 
    etherscan: {
    apiKey: { zKatana: "abc" },
    customChains: [
      {
        network: "zKatana",
        chainId: 1261120,
        urls: {
          apiURL: "https://zkatana.blockscout.com/api",
          browserURL: "https://zkatana.blockscout.com"
        }
      }
    ]
  },
};

export default config;
