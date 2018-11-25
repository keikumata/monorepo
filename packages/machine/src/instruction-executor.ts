import * as cf from "@counterfactual/cf.js";
import { ethers } from "ethers";

import { ActionExecution, instructionGroupFromProtocolName } from "./action";
import { Opcode } from "./instructions";
import { Middleware } from "./middleware/middleware";
import { ProtocolOperation } from "./middleware/protocol-operation/types";
import { Node } from "./node";
import { InstructionMiddlewareCallback, StateProposal } from "./types";

export class InstructionExecutorConfig {
  constructor(
    readonly responseHandler: cf.legacy.node.ResponseSink,
    readonly network: cf.legacy.network.NetworkContext,
    readonly state?: cf.legacy.channel.StateChannelInfos
  ) {}
}

export class InstructionExecutor {
  /**
   * The object responsible for processing each Instruction in the Vm.
   */
  public middleware: Middleware;
  /**
   * The delegate handler we send responses to.
   */
  public responseHandler: cf.legacy.node.ResponseSink;
  /**
   * The underlying state for the entire machine. All state here is a result of
   * a completed and commited protocol.
   */
  public node: Node;

  constructor(config: InstructionExecutorConfig) {
    this.responseHandler = config.responseHandler;
    this.node = new Node(config.state || {}, config.network);
    this.middleware = new Middleware(this.node);
  }

  public dispatchReceivedMessage(msg: cf.legacy.node.ClientActionMessage) {
    this.execute(
      new ActionExecution(
        msg.action,
        instructionGroupFromProtocolName(msg.action, msg.seq),
        msg,
        this
      )
    );
  }

  public runUpdateProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string,
    appId: string,
    encodedAppState: string,
    appStateHash: cf.legacy.utils.H256
  ) {
    this.execute(
      new ActionExecution(
        cf.legacy.node.ActionName.UPDATE,
        instructionGroupFromProtocolName(cf.legacy.node.ActionName.UPDATE, 0),
        {
          appId,
          multisigAddress,
          fromAddress,
          toAddress,
          action: cf.legacy.node.ActionName.UPDATE,
          data: {
            encodedAppState,
            appStateHash
          },
          seq: 0
        },
        this
      )
    );
  }

  public runUninstallProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string,
    peerAmounts: cf.legacy.utils.PeerBalance[],
    appId: string
  ) {
    this.execute(
      new ActionExecution(
        cf.legacy.node.ActionName.UNINSTALL,
        instructionGroupFromProtocolName(
          cf.legacy.node.ActionName.UNINSTALL,
          0
        ),
        {
          appId,
          multisigAddress,
          fromAddress,
          toAddress,
          action: cf.legacy.node.ActionName.UNINSTALL,
          data: {
            peerAmounts
          },
          seq: 0
        },
        this
      )
    );
  }

  /*
  multisigAddress: multisig address between `from` and `intermediary`
  */
  public runInstallMetachannelAppProtocol(
    fromAddress: string,
    intermediaryAddress: string,
    toAddress: string,
    multisigAddress: string,
    installData: cf.legacy.app.InstallData
  ) {
    new ActionExecution(
      cf.legacy.node.ActionName.INSTALL_METACHANNEL_APP,
      [],
      {
        multisigAddress,
        toAddress,
        fromAddress,
        action: cf.legacy.node.ActionName.INSTALL_METACHANNEL_APP,
        data: installData,
        seq: 0
      },
      this
    );
  }

  public runInstallProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string,
    installData: cf.legacy.app.InstallData
  ) {
    this.execute(
      new ActionExecution(
        cf.legacy.node.ActionName.INSTALL,
        instructionGroupFromProtocolName(cf.legacy.node.ActionName.INSTALL, 0),
        {
          multisigAddress,
          toAddress,
          fromAddress,
          action: cf.legacy.node.ActionName.INSTALL,
          data: installData,
          seq: 0
        },
        this
      )
    );
  }

  public runSetupProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string
  ) {
    this.execute(
      new ActionExecution(
        cf.legacy.node.ActionName.SETUP,
        instructionGroupFromProtocolName(cf.legacy.node.ActionName.SETUP, 0),
        {
          multisigAddress,
          toAddress,
          fromAddress,
          seq: 0,
          action: cf.legacy.node.ActionName.SETUP
        },
        this
      )
    );
  }

  public async execute(execution: ActionExecution) {
    await this.run(execution);
  }

  public async run(execution: ActionExecution) {
    let ret;
    ret = await execution.runAll();
    this.sendResponse(cf.legacy.node.ResponseStatus.COMPLETED);
    return ret;
  }

  public sendResponse(status: cf.legacy.node.ResponseStatus) {
    this.responseHandler.sendResponse(new cf.legacy.node.Response(status));
  }

  public mutateState(state: cf.legacy.channel.StateChannelInfos) {
    Object.assign(this.node.channelStates, state);
  }

  public register(scope: Opcode, method: InstructionMiddlewareCallback) {
    this.middleware.add(scope, method);
  }
}

export interface IntermediateResults {
  outbox: cf.legacy.node.ClientActionMessage[];
  inbox: cf.legacy.node.ClientActionMessage[];
  proposedStateTransition?: StateProposal;
  operation?: ProtocolOperation;
  signature?: ethers.utils.Signature;
}

export interface Context {
  intermediateResults: IntermediateResults;
  // TODO: @IIIIllllIIIIllllIIIIllllIIIIllllIIIIll the following fields are very special-purpose and only accessed
  // in one place; it would be nice to get rid of them
  instructionExecutor: InstructionExecutor;
}
