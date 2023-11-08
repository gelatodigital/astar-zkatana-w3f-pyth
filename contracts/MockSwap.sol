//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.18;

import "hardhat/console.sol";

import {IPyth} from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import {PythStructs} from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
struct Pair {
    uint256 usdc;
    uint256 weth;
}

contract MockSwap {
    uint256 constant FACTOR = 100000000000000;

    mapping(address => Pair) public balanceByUser;
    mapping(address => address) public operatorByUser;

    IPyth private _pyth;

    constructor(address pythContract) {
        _pyth = IPyth(pythContract);
    }

    function setOperator(address operator) external {
        operatorByUser[msg.sender] = operator;
    }

    function deposit(address user, uint256 amount) external {
        require(
            msg.sender == user || msg.sender == operatorByUser[user],
            "MockSwap.swap not allowed"
        );

        balanceByUser[user].usdc = balanceByUser[user].usdc + amount;
    }

    function swap(address user, bool buy) external {
        require(
            msg.sender == user || msg.sender == operatorByUser[user],
            "MockSwap.swap not allowed"
        );
        bytes32 priceID = bytes32(
            0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6
        );

        PythStructs.Price memory checkPrice = _pyth.getPriceUnsafe(priceID);

        Pair storage userPair = balanceByUser[user];
        require(
            (buy == true && userPair.weth == 0) ||
                (buy == false && userPair.usdc == 0),
            "MockSwap.swap wrong config trade"
        );

        if (buy) {
            userPair.weth = (userPair.usdc * FACTOR) / uint64(checkPrice.price);
            userPair.usdc = 0;
        } else {
            userPair.usdc =
                ((userPair.weth * uint64(checkPrice.price)) / FACTOR) +
                userPair.usdc;
            userPair.weth = 0;
        }
    }
}
