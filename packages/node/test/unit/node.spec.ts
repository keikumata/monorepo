import firebasemock from "firebase-mock";

import { Node } from "../../src/node";

describe("Basic Node operations", () => {
  it("exists", () => {
    expect(Node).toBeDefined();
  });

  it("can be instantiated", () => {
    const node = new Node(new firebasemock.MockFirestore());
    expect(node).toBeDefined();
  });
});
