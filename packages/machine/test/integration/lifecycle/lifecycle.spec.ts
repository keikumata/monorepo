import * as cf from "@counterfactual/cf.js";
import { ethers } from "ethers";

import {
  A_PRIVATE_KEY,
  B_PRIVATE_KEY,
  A_ADDRESS,
  B_ADDRESS,
  UNUSED_FUNDED_ACCOUNT
} from "../../utils/environment";

import { TestResponseSink } from "../test-response-sink";
import { SetupProtocol } from "./setup-protocol";
import { Depositor } from "./depositor";

/**
 * Tests that the machine's State is correctly modified during the lifecycle
 * of a state channel application, TicTacToeSimulator, running the setup, install, update,
 * and uninstall protocols.
 */
describe("Machine State Lifecycle", async () => {
  // extending the timeout to allow the async machines to finish
  // and give time to `recoverAddress` to order signing keys right
  // for setting commitments
  jest.setTimeout(50000);

  it.only("should modify machine state during the lifecycle of TicTacToeSimulator", async () => {
    const [peerA, peerB]: TestResponseSink[] = getCommunicatingPeers();
    await SetupProtocol.validateAndRun(peerA, peerB);
    await Depositor.makeDeposits(peerA, peerB);
    await TicTacToeSimulator.simulatePlayingGame(peerA, peerB);
  });
});

/**
 * @returns the wallets containing the machines that will be used for the test.
 */
function getCommunicatingPeers(): TestResponseSink[] {
  // TODO: Document somewhere that the .signingKey.address" *must* be a hex otherwise
  // machine/src/middleware/node-transition/install-proposer.ts:98:14
  // will throw an error when doing BigNumber.gt check.
  // https://github.com/counterfactual/monorepo/issues/110

  // TODO: Furthermore document that these will eventually be used to generate
  // the `signingKeys` in any proposals e.g., InstallProposer, thus the proposal
  // will fail if they are not valid Ethereum addresses
  // https://github.com/counterfactual/monorepo/issues/109
  const peerA = new TestResponseSink(A_PRIVATE_KEY);
  const peerB = new TestResponseSink(B_PRIVATE_KEY);

  peerA.io.peers.set(B_ADDRESS, peerB);
  peerB.io.peers.set(A_ADDRESS, peerA);

  return [peerA, peerB];
}

class TicTacToeSimulator {
  public static async simulatePlayingGame(
    peerA: TestResponseSink,
    peerB: TestResponseSink
  ) {
    const cfAddr = await TicTacToeSimulator.installTtt(peerA, peerB);
    await TicTacToeSimulator.makeMoves(peerA, peerB, cfAddr);
    await TicTacToeSimulator.uninstall(peerA, peerB, cfAddr);
    return cfAddr;
  }

  public static async installTtt(
    peerA: TestResponseSink,
    peerB: TestResponseSink
  ) {
    const msg = TicTacToeSimulator.installMsg(
      peerA.signingKey.address!,
      peerB.signingKey.address!
    );
    const response = await peerA.runInstallProtocol(
      peerA.signingKey.address!,
      peerB.signingKey.address!,
      UNUSED_FUNDED_ACCOUNT,
      msg
    )
    expect(response.status).toEqual(cf.legacy.node.ResponseStatus.COMPLETED);
    return TicTacToeSimulator.validateInstall(peerA, peerB);
  }

  public static installMsg(
    to: string,
    from: string
  ): cf.legacy.app.InstallData {
    let peerA = from;
    let peerB = to;
    if (peerB.localeCompare(peerA) < 0) {
      const tmp = peerA;
      peerA = peerB;
      peerB = tmp;
    }
    const terms = new cf.legacy.app.Terms(
      0,
      new ethers.utils.BigNumber(10),
      ethers.constants.AddressZero
    ); // TODO:
    const app = new cf.legacy.app.AppInterface(
      "0x0",
      "0x11111111",
      "0x11111111",
      "0x11111111",
      "0x11111111",
      ""
    ); // TODO:
    const timeout = 100;
    return {
      terms,
      app,
      timeout,
      peerA: new cf.legacy.utils.PeerBalance(peerA, 2),
      peerB: new cf.legacy.utils.PeerBalance(peerB, 2),
      keyA: peerA,
      keyB: peerB,
      encodedAppState: "0x1234"
    };
  }

  public static async validateInstall(
    peerA: TestResponseSink,
    peerB: TestResponseSink
  ): Promise<string> {
    TicTacToeSimulator.validateInstallWallet(peerA, peerB);
    // Wait for other client to finish, since the machine is async
    await cf.legacy.utils.sleep(50);
    return TicTacToeSimulator.validateInstallWallet(peerB, peerA);
  }

  public static validateInstallWallet(
    peerA: TestResponseSink,
    peerB: TestResponseSink
  ): string {
    const stateChannel =
      peerA.instructionExecutor.node.channelStates[UNUSED_FUNDED_ACCOUNT];
    const appInstances = stateChannel.appInstances;
    const cfAddrs = Object.keys(appInstances);
    expect(cfAddrs.length).toEqual(1);

    // first validate the app
    const cfAddr = cfAddrs[0];
    expect(appInstances[cfAddr].peerA.balance.toNumber()).toEqual(2);
    expect(appInstances[cfAddr].peerB.balance.toNumber()).toEqual(2);

    // now validate the free balance
    const channel =
      peerA.instructionExecutor.node.channelStates[UNUSED_FUNDED_ACCOUNT];
    // start with 10, 5 and both parties deposit 2 into TicTacToeSimulator.
    expect(channel.freeBalance.aliceBalance.toNumber()).toEqual(8);
    expect(channel.freeBalance.bobBalance.toNumber()).toEqual(3);
    return cfAddr;
  }

  /**
   * Game is over at the end of this functon call and is ready to be uninstalled.
   */
  public static async makeMoves(
    peerA: TestResponseSink,
    peerB: TestResponseSink,
    cfAddr: string
  ) {
    const state = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const X = 1;
    const O = 2;

    await TicTacToeSimulator.makeMove(peerA, peerB, cfAddr, state, 0, X, 1);
    await TicTacToeSimulator.makeMove(peerB, peerA, cfAddr, state, 4, O, 2);
    await TicTacToeSimulator.makeMove(peerA, peerB, cfAddr, state, 1, X, 3);
    await TicTacToeSimulator.makeMove(peerB, peerA, cfAddr, state, 5, O, 4);
    await TicTacToeSimulator.makeMove(peerA, peerB, cfAddr, state, 2, X, 5);
  }

  public static async makeMove(
    peerA: TestResponseSink,
    peerB: TestResponseSink,
    cfAddr: string,
    appState: number[],
    cell: number,
    side: number,
    moveNumber: number
  ) {
    appState[cell] = side;
    const state = appState.toString();
    const response = await peerA.runUpdateProtocol(
      peerA.signingKey.address!,
      peerB.signingKey.address!,
      UNUSED_FUNDED_ACCOUNT,
      cfAddr,
      state,
      ethers.constants.HashZero
    )
    expect(response.status).toEqual(cf.legacy.node.ResponseStatus.COMPLETED);
    TicTacToeSimulator.validateMakeMove(
      peerA,
      peerB,
      cfAddr,
      state,
      moveNumber
    );
    await cf.legacy.utils.sleep(50);
    TicTacToeSimulator.validateMakeMove(
      peerB,
      peerA,
      cfAddr,
      state,
      moveNumber
    );
  }

  public static validateMakeMove(
    peerA: TestResponseSink,
    peerB: TestResponseSink,
    cfAddr,
    appState: string,
    moveNumber: number
  ) {
    const appA =
      peerA.instructionExecutor.node.channelStates[UNUSED_FUNDED_ACCOUNT]
        .appInstances[cfAddr];
    const appB =
      peerB.instructionExecutor.node.channelStates[UNUSED_FUNDED_ACCOUNT]
        .appInstances[cfAddr];

    expect(appA.encodedState).toEqual(appState);
    expect(appA.localNonce).toEqual(moveNumber + 1);
    expect(appB.encodedState).toEqual(appState);
    expect(appB.localNonce).toEqual(moveNumber + 1);
  }

  public static async uninstall(
    peerA: TestResponseSink,
    peerB: TestResponseSink,
    cfAddr: string
  ) {
    const response = await peerA.runUninstallProtocol(
      peerA.signingKey.address!,
      peerB.signingKey.address!,
      UNUSED_FUNDED_ACCOUNT,
      [
        new cf.legacy.utils.PeerBalance(peerA.signingKey.address!, ethers.utils.bigNumberify(4)),
        new cf.legacy.utils.PeerBalance(peerB.signingKey.address!, ethers.utils.bigNumberify(0))
      ],
      cfAddr
    )
    expect(response.status).toEqual(cf.legacy.node.ResponseStatus.COMPLETED);
    // A wins so give him 2 and subtract 2 from B
    TicTacToeSimulator.validateUninstall(
      cfAddr,
      peerA,
      ethers.utils.bigNumberify(12),
      ethers.utils.bigNumberify(3)
    );
    await cf.legacy.utils.sleep(50);
    TicTacToeSimulator.validateUninstall(
      cfAddr,
      peerB,
      ethers.utils.bigNumberify(12),
      ethers.utils.bigNumberify(3)
    );
  }

  public static validateUninstall(
    cfAddr: string,
    wallet: TestResponseSink,
    amountA: ethers.utils.BigNumber,
    amountB: ethers.utils.BigNumber
  ) {
    const channel =
      wallet.instructionExecutor.node.channelStates[UNUSED_FUNDED_ACCOUNT];
    const app = channel.appInstances[cfAddr];
    expect(channel.freeBalance.aliceBalance).toEqual(amountA);
    expect(channel.freeBalance.bobBalance).toEqual(amountB);
    expect(channel.freeBalance.uniqueId).toEqual(0);
    expect(app.dependencyNonce.nonceValue).toEqual(1);
  }
}
