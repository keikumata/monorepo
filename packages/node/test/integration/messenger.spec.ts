import * as dotenv from "dotenv";
import firebase from "firebase";

import { Node } from "../../src";

// This suite is mostly spike code

dotenv.config();
describe("Nodes can talk communicate with each other", () => {
  afterAll(async () => {
    await firebase.app().delete();
  });

  it("can initialize a firebase handle", () => {
    firebase.initializeApp({
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    const settings = { timestampsInSnapshots: true };
    firebase.firestore().settings(settings);

    expect(firebase.firestore().collection("messages")).toBeDefined();
  });

  it("Nodes can send a message back and forth about an AppInstance", async done => {
    const appInstanceID = "0x1111";
    const installProposalMessage = {
      action: "PROPOSE_INSTALL"
    };
    const installMessage = {
      action: "INSTALL"
    };
    const nodeA = new Node(firebase.firestore(), "A");
    const nodeB = new Node(firebase.firestore(), "B");

    // Not the actual flow obviously
    const appInstanceEventsA = await nodeA.openApp(appInstanceID, "B");
    const appInstanceEventsB = await nodeB.openApp(appInstanceID, "A");

    appInstanceEventsB.on("update", message => {
      expect(message).toEqual(installProposalMessage);
    });
    appInstanceEventsA.on("update", message => {
      expect(message).toEqual(installMessage);
      done();
    });

    await nodeA.send(appInstanceID, "B", installProposalMessage);
    await nodeB.send(appInstanceID, "A", installMessage);
  });
});
