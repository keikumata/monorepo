import * as cf from "@counterfactual/cf.js";
import { EventEmitter } from "events";
import firebase from "firebase";
import * as _ from "lodash";

import { MultisigAddress, StateChannelInfo } from "./channel";

/**
 * The Node class is the entry point to the @counterfactual/node package.
 * It's responsible for:
 * - encapsulating channels and their apps
 * - connecting with a provided database to persistently store commitments
 * - registering a signing service
 */
export class Node {
  private channels: Map<MultisigAddress, StateChannelInfo> = new Map();
  public firebase: firebase.firestore.Firestore;

  // Maps AppInstanceIDs to the EventEmitters sending/receiving events for
  // the relevant AppInstance.
  private eventEmitters: Map<string, EventEmitter> = new Map();

  constructor(
    firestore: firebase.firestore.Firestore,
    // temporary identifier for current user
    private ID: string = ""
  ) {
    this.firebase = firestore;
  }

  /**
   * Returns all of the apps installed across all of the channels in the Node.
   */
  getApps(): cf.legacy.app.AppInstanceInfo[] {
    const apps: cf.legacy.app.AppInstanceInfo[] = [];
    this.channels.forEach(
      (channel: StateChannelInfo, multisigAddress: string) => {
        _.values(channel.appInstances).forEach(appInstance => {
          apps.push(appInstance);
        });
      }
    );
    return apps;
  }

  /**
   * Opens a connection specifically for this app with the consumer of this
   * node.
   * It also creates a communication channel to send messages back and forth
   * for this AppInstance.
   * @returns An EventEmitter to emit events related to this app for consumers
   * subscribing to app updates.
   */
  async openApp(
    appInstanceID: string,
    counterpartyID: string = ""
  ): Promise<EventEmitter> {
    const appInstanceEventEmitter = new EventEmitter();
    this.setupListeners(appInstanceEventEmitter);
    this.eventEmitters.set(appInstanceID, appInstanceEventEmitter);
    const communicationChannelID = `${appInstanceID}_${
      this.ID
    }_${counterpartyID}`;

    this.firebase
      .collection("messages")
      .doc(communicationChannelID)
      .onSnapshot(doc => {
        appInstanceEventEmitter.emit("update", doc.data());
      });
    return appInstanceEventEmitter;
  }

  // Spike code
  async send(appInstanceID: string, counterpartyID: string, message: object) {
    const communicationChannelID = `${appInstanceID}_${counterpartyID}_${
      this.ID
    }`;
    await this.firebase
      .collection("messages")
      .doc(communicationChannelID)
      .set(message);
  }

  // The following methods are private.

  /**
   * Sets up listeners for relevant events for the given Emitter.
   * @param appInstanceEventEmitter
   */
  private setupListeners(appInstanceEventEmitter: EventEmitter) {
    appInstanceEventEmitter.on("proposeInstall", (proposeData: object) => {
      // TODO: add pending application to node and return AppInstanceID
    });

    appInstanceEventEmitter.on("install", (installData: object) => {
      // TODO: add application to node and return AppInstance
    });
  }
}
