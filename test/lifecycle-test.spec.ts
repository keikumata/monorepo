import { TestWallet } from "./wallet/wallet";
import { ClientMessage } from "../src/types";
import { ResponseStatus } from "../src/vm";

describe("Lifecycle", async () => {
	it("should have the correct funds on chain", async () => {
		//given
		let walletA = new TestWallet("0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd0");
		let walletB = new TestWallet("0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd1");
		walletA.io.peer = walletB;
		walletB.io.peer = walletA;

		//when
		await setup(walletA, walletB);
		await makeDeposits(walletA, walletB);
		await playTtt(walletA, walletB);

		// then
		validateSystem(walletA);
		validateSystem(walletB);
		await validateBlockchain();
	});
});

async function setup(walletA: TestWallet, walletB: TestWallet) {
	validatePresetup(walletA, walletB);
	let msg = setupStartMsg(walletA.address, walletB.address);
	let response = await walletA.runProtocol(msg);
	expect(response.status).toBe(ResponseStatus.COMPLETED);
	validateSetup(walletA, walletB);
}

function validatePresetup(walletA: TestWallet, walletB: TestWallet) {
	expect(walletA.vm.cfState.channelStates).toEqual({});
	expect(walletB.vm.cfState.channelStates).toEqual({});
}

function setupStartMsg(from: string, to: string): ClientMessage {
	return {
		requestId: "0",
		appName: undefined,
		appId: undefined,
		action: "setup",
		data: {},
		multisigAddress: "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd4",
		toAddress: to,
		fromAddress: from,
		stateChannel: undefined,
		seq: 0
	};
}

function validateSetup(walletA: TestWallet, walletB: TestWallet) {
	let stateA = walletA.vm.cfState;
	let stateB = walletB.vm.cfState;

	let peerA = walletA.address;
	let peerB = walletB.address;
	if (peerB.localeCompare(peerA) < 0) {
		let tmp = peerA;
		peerA = peerB;
		peerB = peerA;
	}

	let multisig = "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd4";

	// valiate A's state
	let aChannel = stateA.channelStates[multisig];
	expect(Object.keys(stateA.channelStates).length).toBe(1);
	expect(aChannel.toAddress).toBe(walletB.address);
	expect(aChannel.fromAddress).toBe(walletA.address);
	expect(aChannel.multisigAddress).toBe(multisig);
	expect(aChannel.appChannels).toEqual({});
	expect(aChannel.freeBalance.peerA.address).toBe(peerA);
	expect(aChannel.freeBalance.peerB.address).toBe(peerB);
	expect(aChannel.freeBalance.peerA.balance).toBe(0);
	expect(aChannel.freeBalance.peerB.balance).toBe(0);

	// validate B's state
	let bChannel = stateB.channelStates[multisig];
	expect(Object.keys(stateB.channelStates).length).toBe(1);
	expect(bChannel.toAddress).toBe(walletA.address);
	expect(bChannel.fromAddress).toBe(walletB.address);
	expect(bChannel.multisigAddress).toBe(multisig);
	expect(bChannel.appChannels).toEqual({});
	expect(bChannel.freeBalance.peerA.address).toBe(peerA);
	expect(bChannel.freeBalance.peerB.address).toBe(peerB);
	expect(bChannel.freeBalance.peerA.balance).toBe(0);
	expect(bChannel.freeBalance.peerB.balance).toBe(0);
}
async function makeDeposits(
	walletA: TestWallet,
	walletB: TestWallet
): Promise<any> {
	// todo
}

function validateDeposits(walletA: TestWallet, walletB: TestWallet) {
	// todo
}

async function playTtt(walletA: TestWallet, walletB: TestWallet) {
	// todo
}

function validateTtt(walletA: TestWallet, walletB: TestWallet) {
	// todo
}

function validateSystem(wallet: TestWallet) {
	// todo
}

async function validateBlockchain(): Promise<any> {
	// todo
}