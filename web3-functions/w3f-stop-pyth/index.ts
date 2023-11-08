/* eslint-disable @typescript-eslint/naming-convention */
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { Contract, utils } from "ethers";

import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";
import { IPyth, MockSwap } from "../../typechain";
import { pythAbi } from "./pythAbi";
import MockSwapJson from "../../artifacts/contracts/MockSwap.sol/MockSwap.json"
interface IPRICE {
  price: number;
  timestamp: number;
}

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, storage, secrets, multiChainProvider } = context;

  const provider = multiChainProvider.default();
  ///// User Args
  const user = userArgs.user as string;
  const MOCK_SWAP_ADDRESS  = userArgs.mockSwapAddress as string;
  const PYTH_NETWORK_ADDRESS = (userArgs.pythNetworkAddress as string) ?? "";
  const priceIds = (userArgs.priceIds ?? "") as string[];
  
  //// Storage
  const lastMax = +((await storage.get("lastMax")) ?? "0");

  //// Secrets
  const EXIT = +((await secrets.get("EXIT")) as string);

  const mockSwapContract = new Contract(
    MOCK_SWAP_ADDRESS,
    MockSwapJson.abi,
    provider
  ) as MockSwap;


  let userBalance =  await mockSwapContract.balanceByUser(user);

  let wethBalance = +userBalance.weth.toString();

  
  if (wethBalance > 0) { 

  const pythnetwork = new Contract(
    PYTH_NETWORK_ADDRESS,
    pythAbi,
    provider
  ) as IPyth;


  // Get Pyth price data
  const connection = new EvmPriceServiceConnection(
    "https://xc-testnet.pyth.network"
  ); // See Price Service endpoints section below for other endpoints

  const check = (await connection.getLatestPriceFeeds(priceIds)) as any[];
  if (
    check.length == 0 ||
    check[0].price == undefined ||
    check[0].price.price == undefined
  ) {
    return { canExec: false, message: "No price available" };
  }

  const currentPrice: IPRICE = {
    price: +check[0].price.price,
    timestamp: +check[0].price.publishTime,
  };

  if (lastMax == 0) {
    await storage.set("lastMax", currentPrice.price.toString());
    return { canExec: false, message: "Initiatig Price Exit" };
  }

  let price = currentPrice.price
  let diff = lastMax - price;
  if (diff < 0) {
    ///  *****************************************************  ///
    ///  Price is going up, update to new max
    ///  *****************************************************  ///
    await storage.set("lastMax", price.toString());
    console.log(
      `Old lastMax: ${lastMax.toString()}, New lastMax: ${price.toString()}`
    );
    return { canExec: false, message: "No Trade Exit ---> Price UP " };
  } else if (diff == 0) {
    ///  *****************************************************  ///
    ///  Price not moving doing Nothing
    ///  *****************************************************  ///
    return {
      canExec: false,
      message: `No Trade Exit ---> No Price change: ${price.toString()} `,
    };
  } else if (diff / lastMax < EXIT / 100) {
    ///  *****************************************************  ///
    ///  Price decrease too small, doing Nothing
    ///  *****************************************************  ///
    console.log(
      `Current lastMax: ${lastMax.toString()}, currentPrice: ${price.toString()}`
    );
    return {
      canExec: false,
      message: `No Trade Exit ---> Price decrease Small ${(
        (diff / lastMax) *
        100
      ).toFixed(2)} %`,
    };
  } else {
    ///  *****************************************************  ///
    ///  Price Decrease Greater than threshold ---> EXIT THE TRADE
    ///  *****************************************************  ///
    storage.set("lastMax", "0");

    console.log(
      `Trade Exit---> Price Decrease ${((diff / lastMax) * 100).toFixed(
        2
      )} greater than ${EXIT} %`
    );


    const iface = mockSwapContract.interface;
    let callDataSwap = iface.encodeFunctionData("swap", [user, false]);

    let payloadSwap = 
        {
          to: mockSwapContract.address,
          data: callDataSwap,
        };


    const updatePriceData = await connection.getPriceFeedsUpdateData(priceIds);       
    const fee = (await pythnetwork.getUpdateFee(updatePriceData)).toString();
    const callDataPyth = await pythnetwork.interface.encodeFunctionData("updatePriceFeeds" ,[updatePriceData])
    let payloadPyth = {
      to: PYTH_NETWORK_ADDRESS,
      data: callDataPyth,
      value: fee,
    };


    return {
      canExec: true,
      callData: [ payloadPyth, payloadSwap
        
      ],
    };
  }
  } else {
    return {
      canExec:false,
      message:"No Active Trade"
    }
  }
});
