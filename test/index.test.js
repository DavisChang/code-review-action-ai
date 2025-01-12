const { parseResponseToComments } = require("../index");

describe("parseResponseToComments", () => {
  it("should correctly parse OpenAI responses", () => {
    const response = `
      Line 10: This is a comment.
      Line 20: Another comment.
    `;
    const filename = "test.js";

    const comments = parseResponseToComments(response, filename);

    expect(comments).toEqual([
      {
        body: "This is a comment.",
        path: "test.js",
        position: 10,
      },
      {
        body: "Another comment.",
        path: "test.js",
        position: 20,
      },
    ]);
  });
});
