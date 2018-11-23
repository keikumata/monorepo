import firebasemock from "firebase-mock";

import { Node } from "../../src/node";

describe("Apps", () => {
  let node: Node;
  beforeEach(() => {
    node = new Node(new firebasemock.MockFirestore());
  });

  it("can open a connection with an app", () => {
    const appInstanceEventEmitter = node.openApp("1");
    expect(appInstanceEventEmitter).toBeDefined();
  });

  it("can get empty list of apps", () => {
    const apps = node.getApps();
    expect(apps).toEqual([]);
  });
});
