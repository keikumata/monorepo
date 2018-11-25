import * as cf from "@counterfactual/cf.js";
import { ClientActionMessage } from "@counterfactual/cf.js/dist/src/legacy/node";

import { Context } from "./instruction-executor";
import { NextMsgGenerator } from "./middleware/middleware";
import { EthOpGenerator } from "./middleware/protocol-operation";
import { InstallProposer } from "./middleware/state-transition/install-proposer";
import { SetupProposer } from "./middleware/state-transition/setup-proposer";
import { UninstallProposer } from "./middleware/state-transition/uninstall-proposer";
import { UpdateProposer } from "./middleware/state-transition/update-proposer";
import { InternalMessage } from "./types";

export enum Opcode {
  /**
   * Optimistically creates the new state that will result if a protocol
   * completes. Useful for other opcodes that may need to know about such state,
   * for example, to generate the correct cf operation.
   */
  STATE_TRANSITION_PROPOSE = 0,
  /**
   * Saves the new state upon completion of a protocol, using the state from
   * STATE_TRANSITION_PROPOSE. Assumes all messages have been exchanged and
   * the state has gone through PROPOSE and PREPARE already.
   */
  STATE_TRANSITION_COMMIT,
  /**
   * Requests a signature on the hash of a previously generated ProtocolOperation.
   */
  OP_SIGN,
  /**
   * Ensures a signature is both correclty signed and is representative of a
   * correctly formed cf operation.
   */
  OP_SIGN_VALIDATE,
  /**
   * Sends a ClientMessage to a peer.
   */
  IO_SEND,
  /**
   * Blocks the action execution until the next message is received by a peer.
   * The registered middleware for this instruction *must* return the received
   * ClientMessage from the peer.
   */
  IO_WAIT
}

const swap = function(msg: ClientActionMessage) {
  const from = msg.fromAddress;
  const to = msg.toAddress;
  msg.fromAddress = to;
  msg.toAddress = from;
};

export const FLOWS = {
  [cf.legacy.node.ActionName.UPDATE]: {
    0: [
      (message, context, node) => {
        context.intermediateResults.proposedStateTransition = UpdateProposer.propose(
          message,
          node
        );
        context.intermediateResults.operation = EthOpGenerator.generate(
          message,
          () => {},
          context,
          node
        );
      },
      Opcode.OP_SIGN,
      (message: InternalMessage, context: Context) => {
        const ret = NextMsgGenerator.generate2(
          message.clientMessage,
          context.intermediateResults.signature!
        );
        context.intermediateResults.outbox.push(ret);
      },
      Opcode.IO_SEND,
      Opcode.IO_WAIT,
      Opcode.OP_SIGN_VALIDATE,
      Opcode.STATE_TRANSITION_COMMIT
    ],
    1: [
      (message, context, node) => {
        swap(message.clientMessage);
        context.intermediateResults.proposedStateTransition = UpdateProposer.propose(
          message,
          node
        );
        context.intermediateResults.operation = EthOpGenerator.generate(
          message,
          () => {},
          context,
          node
        );
      },
      Opcode.OP_SIGN_VALIDATE,
      Opcode.OP_SIGN,
      (message: InternalMessage, context: Context) => {
        const ret = NextMsgGenerator.generate2(
          message.clientMessage,
          context.intermediateResults.signature!
        );
        context.intermediateResults.outbox.push(ret);
      },
      Opcode.IO_SEND,
      Opcode.STATE_TRANSITION_COMMIT
    ]
  },
  [cf.legacy.node.ActionName.SETUP]: {
    0: [
      (message, context, node) => {
        context.intermediateResults.proposedStateTransition = SetupProposer.propose(
          message
        );
        context.intermediateResults.operation = EthOpGenerator.setup(
          message,
          node,
          context.intermediateResults.proposedStateTransition.state
        );
      },
      Opcode.OP_SIGN,
      (message: InternalMessage, context: Context) => {
        const ret = NextMsgGenerator.generate2(
          message.clientMessage,
          context.intermediateResults.signature!
        );
        context.intermediateResults.outbox.push(ret);
      },
      Opcode.IO_SEND,
      Opcode.IO_WAIT,
      Opcode.OP_SIGN_VALIDATE,
      Opcode.STATE_TRANSITION_COMMIT
    ],
    1: [
      (message: InternalMessage, context: Context, node) => {
        // swap
        swap(message.clientMessage);

        context.intermediateResults.proposedStateTransition = SetupProposer.propose(
          message
        );
        context.intermediateResults.operation = EthOpGenerator.setup(
          message,
          node,
          context.intermediateResults.proposedStateTransition.state
        );
      },
      Opcode.OP_SIGN_VALIDATE,
      Opcode.OP_SIGN,
      (message: InternalMessage, context: Context) => {
        const ret = NextMsgGenerator.generate2(
          message.clientMessage,
          context.intermediateResults.signature!
        );
        context.intermediateResults.outbox.push(ret);
      },
      Opcode.IO_SEND,
      Opcode.STATE_TRANSITION_COMMIT
    ]
  },
  [cf.legacy.node.ActionName.INSTALL]: {
    0: [
      (message, context: Context, node) => {
        context.intermediateResults.proposedStateTransition = InstallProposer.propose(
          message,
          context,
          node
        );
        context.intermediateResults.operation = EthOpGenerator.install(
          message,
          context,
          node,
          context.intermediateResults.proposedStateTransition.state,
          context.intermediateResults.proposedStateTransition.cfAddr!
        );
      },
      Opcode.OP_SIGN,
      (message: InternalMessage, context: Context) => {
        const ret = NextMsgGenerator.generate2(
          message.clientMessage,
          context.intermediateResults.signature!
        );
        context.intermediateResults.outbox.push(ret);
      },
      Opcode.IO_SEND,
      Opcode.IO_WAIT,
      Opcode.OP_SIGN_VALIDATE,
      Opcode.STATE_TRANSITION_COMMIT
    ],
    1: [
      (message, context: Context, node) => {
        swap(message.clientMessage);
        context.intermediateResults.proposedStateTransition = InstallProposer.propose(
          message,
          context,
          node
        );
        context.intermediateResults.operation = EthOpGenerator.install(
          message,
          context,
          node,
          context.intermediateResults.proposedStateTransition.state,
          context.intermediateResults.proposedStateTransition.cfAddr!
        );
      },
      Opcode.OP_SIGN_VALIDATE,
      Opcode.OP_SIGN,
      (message: InternalMessage, context: Context) => {
        const ret = NextMsgGenerator.generate2(
          message.clientMessage,
          context.intermediateResults.signature!
        );
        context.intermediateResults.outbox.push(ret);
      },
      Opcode.IO_SEND,
      Opcode.STATE_TRANSITION_COMMIT
    ]
  },
  [cf.legacy.node.ActionName.UNINSTALL]: {
    0: [
      (message, context, node) => {
        context.intermediateResults.proposedStateTransition = UninstallProposer.propose(
          message,
          node
        );
        context.intermediateResults.operation = EthOpGenerator.generate(
          message,
          () => {},
          context,
          node
        );
      },
      Opcode.OP_SIGN,
      (message: InternalMessage, context: Context) => {
        const ret = NextMsgGenerator.generate2(
          message.clientMessage,
          context.intermediateResults.signature!
        );
        context.intermediateResults.outbox.push(ret);
      },
      Opcode.IO_SEND,
      Opcode.IO_WAIT,
      Opcode.OP_SIGN_VALIDATE,
      Opcode.STATE_TRANSITION_COMMIT
    ],
    1: [
      (message, context, node) => {
        swap(message.clientMessage);
        context.intermediateResults.proposedStateTransition = UninstallProposer.propose(
          message,
          node
        );
        context.intermediateResults.operation = EthOpGenerator.generate(
          message,
          () => {},
          context,
          node
        );
      },
      Opcode.OP_SIGN_VALIDATE,
      Opcode.OP_SIGN,
      (message: InternalMessage, context: Context) => {
        const ret = NextMsgGenerator.generate2(
          message.clientMessage,
          context.intermediateResults.signature!
        );
        context.intermediateResults.outbox.push(ret);
      },
      Opcode.IO_SEND,
      Opcode.STATE_TRANSITION_COMMIT
    ]
  },
  [cf.legacy.node.ActionName.INSTALL_METACHANNEL_APP]: {
    0: [
      (message: InternalMessage, context: Context, node) => {
        // todo: add signatures
        context.intermediateResults.outbox[0] = message.clientMessage;
        context.intermediateResults.outbox[0].seq = 1;
      },

      // send to intermediary
      Opcode.IO_SEND,

      // wait for proxy app signature and the self-remove from the proxy
      Opcode.IO_WAIT,
      Opcode.IO_WAIT
    ],
    1: [
      (message: InternalMessage, context: Context, node) => {
        // todo: compose message
        context.intermediateResults.outbox[0].seq = 2;
      },
      Opcode.IO_SEND,
      // wait for the install countersign
      Opcode.IO_WAIT,

      // send the self-remove
      Opcode.IO_SEND,
      Opcode.IO_SEND
    ],
    2: [
      // countersign
      Opcode.IO_SEND,

      // wait for self-remove
      Opcode.IO_WAIT
    ]
  }
};
