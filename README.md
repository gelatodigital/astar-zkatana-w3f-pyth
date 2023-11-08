
# Gelato Web3 functions <<-->> Pyth PoC
Gelato Web3 Functions together with Pyth offer the ability to create fine-tuned customized oracles pushing prices on-chain following predefined logic within the Web3 Function and verifying prices on-chain through the Pyth network.

We have two distinct demos in this repository.

1. [W3F to Pyth and Trailing Stop](./web3-functions/w3f-stop-pyth/index.ts): this demo shows a very simple "Trailing Stop" strategy where a user buys eth and then:
   - We will push up or stop loss if the price goes up.
   - When hitting the stop loss, we will swap the eth to usdc again.
   In this case the W3F queries the pyth price off-chain and run the logic, in the case that the price hit the stop loss, the pyth update price transaction will be sent together with the swap transaciton.


2. [W3F to Pyth Dynamic](./web3-functions/w3f-stop-pyth-priceIds/index.ts): this is an enhanced version of W3F to Pyth that allows dynamic configuration via Github Gist.
The logic for the price update is as follows:
   - Push a price on-chain every hour
   - If the price changes by 2% or more in either direction since the last push, a new price will be pushed

## Funding
We will fund Gelato and Pyth following this process:
1) Gelato:
  The gelato fees are payed with [1Balance](https://docs.gelato.network/developer-services/1balance). 
  1Balance allows to deposit USDC on polygon and run the transactions on every network.

   To fund 1Balance please visit the [1balance app](https://beta.app.gelato.network/balance) and deposit USDC.
   (The 1Balance account has to be created with the same address as the Web3 Function task)
  
  - Switch network to Polygon

      <img src="docs/switch-to-polygon.png" width="320"/>

  - Deposit USDC

      <img src="docs/deposit-usdc.png" width="320"/>

2) Pyth:
The method that updates the price is payable, the update transaction has to include in the msg.value the corresponding fee:

```ts
    /// @notice Update price feeds with given update messages.
    /// This method requires the caller to pay a fee in wei; the required fee can be computed by calling
    /// `getUpdateFee` with the length of the `updateData` array.
    /// Prices will be updated if they are more recent than the current stored prices.
    /// The call will succeed even if the update is not the most recent.
    /// @dev Reverts if the transferred fee is not sufficient or the updateData is invalid.
    /// @param updateData Array of price update data.
    function updatePriceFeeds(bytes[] calldata updateData) external payable;
```
In our two demos we will transfer the fee differently:
  - W3F update pyth network  
    The on-chain transaction executed via a web3 function gets routed through a proxy smart contract which is solely owned by the web3 function task creator. This [dedicatedMsgSender](https://zkatana.blockscout.com/address/0xbB97656cd5fECe3a643335d03C8919D5E7DcD225) proxy contract will be deployed with the first task created and will ultimately be responsible for transferring the fee to the Pyth contract.

    The address can be seen in your app settings (i.e [example app settings](https://beta.app.gelato.network/settings)) 

     <img src="docs/dedicatedMsgSender.png" width="320"/>
    
    Once we have the [dedicatedMsgSender](https://zkatana.blockscout.com/address/0xbB97656cd5fECe3a643335d03C8919D5E7DcD225) address we will have to fund it for paying the fees. 
    In our example we have sent funds to the dedicated MsgSender with this [transaction](https://zkatana.blockscout.com/tx/0xfb5a7883d38445f8b3e7894b433bdfd2396d168e9380cf79678497f0143535cb)

    Once the dedicatedMsgSender is funded, the Web3 Function will execute passing the fee as value in the callData:

    ```ts
    return {
      canExec: true,
      callData: [
        {
          to: pythNetworkAddress,
          data: callData,
          value: fee,
        },
      ],
    };
    ```


## Demo W3F update directly Pyth Contract and "Trailing Stop"2
Live on ZKatana
- Web3 Function: [https://beta.app.gelato.network/functions/task/0x2d376e17ff3b63cf18e623586c51a86843be886457f7809e7194e3aa73f4d00b:1261120](https://beta.app.gelato.network/functions/task/0x2d376e17ff3b63cf18e623586c51a86843be886457f7809e7194e3aa73f4d00b:1261120)

- DedicatedMsgSender [https://zkatana.blockscout.com/address/0xbB97656cd5fECe3a643335d03C8919D5E7DcD225](https://zkatana.blockscout.com/address/0xbB97656cd5fECe3a643335d03C8919D5E7DcD225)



## Development

### How to run 

1. Install project dependencies:
```
yarn install
```

2. Create a `.env` file with your private config:
```
cp .env.example .env
```
You will need to input your `PROVIDER_URL`, your RPC.


3. Test the  web3 function

```
npx w3f test web3-functions/w3f-stop-pyth/index.ts --logs
```

4. Deploy the web3 function on IPFS

```
npx w3f deploy web3-functions/w3f-stop-pyth/index.ts
```


5. Create the task following the link provided when deploying the web3 to IPFS in our case:

$ npx w3f deploy web3-functions/w3f-stop-pyth/index.ts
 ✓ Web3Function deployed to ipfs.
 ✓ CID: QmYMysfAhYYYrdhVytSTiE9phuoT49kMByktXSbVp1aRPx

To create a task that runs your Web3 Function every minute, visit:
> https://beta.app.gelato.network/new-task?cid=QmYMysfAhYYYrdhVytSTiE9phuoT49kMByktXSbVp1aRPx
✨  Done in 3.56s.
```



You can find a template/instructions for W3F Pyth with dynamic configuration values loaded from a Github gist that allows you to update priceIds and various parameters without having to re-deploy the task in `web3-functions/w3f-stop-pyth-priceIds`.

### W3F command options

- `--logs` Show internal Web3Function logs
- `--runtime=thread|docker` Use thread if you don't have dockerset up locally (default: thread)
- `--debug` Show Runtime debug messages
- `--chain-id=number` Specify the chainId (default is Goerli: 5)

Example: `npx w3f test web3-functions/w3f-stop-pyth-priceIds/index.ts --logs --debug`
