import hre, {  } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { sleep } from "../web3-functions/utils";

const isHardhat = hre.network.name === "hardhat";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer, gelatoMsgSender, pyth } = await getNamedAccounts();

  if (!isHardhat) {
    console.log(
      `Deploying SmartOracle to ${hre.network.name}. Hit ctrl + c to abort`
    );
    await sleep(5000);
  }

  await deploy("MockSwap", {
    from: deployer,
    args: ["0xA2aa501b19aff244D90cc15a4Cf739D2725B5729"],
    log: true,
  });
};

func.skip = async () => {
  return false;
};
func.tags = ["MockSwap"];

export default func;
