import { ethers } from "ethers";

contract(
  "AppRegistry - Put State Onchain when Counterparty is Offline",
  (accounts: string[]) => {
    const unlockedAccount = new ethers.Wallet(
      accounts[0],
      new ethers.providers.Web3Provider((global as any).web3.currentProvider)
    );


);
