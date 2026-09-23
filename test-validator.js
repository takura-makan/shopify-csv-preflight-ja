const test = require("node:test");
const assert = require("node:assert/strict");
const { parseCsv, check } = require("./validator");

test("quoted commas, newlines and doubled quotes", () => {
  assert.deepEqual(parseCsv('Title,Description\n"A, B","X\n""Y"""\n'), [["Title", "Description"], ["A, B", 'X\n"Y"']]);
});
test("broken quoting is rejected", () => assert.throws(() => parseCsv('Title\n"abc'), /閉じていない/));
test("new product needs a title column", () => assert.match(check("Name\nA").issues[0].message, /Title列/));
test("update requires handle column", () => assert.match(check("Title\nA", "update").issues[0].message, /URL handle/));
test("variant rows may repeat a handle with blank title", () => {
  assert.equal(check("URL handle,Title,Option1 name,Option1 value\nshirt,Shirt,Size,S\nshirt,,Size,M").issues.length, 0);
});
test("row width mismatch is detected", () => assert.match(check("Title,Status\nA").issues[0].message, /列数/));
test("blank lines are ignored", () => assert.equal(check("Title\nA\n\n").dataRows, 1));
test("status and price are checked without altering data", () => {
  const issues = check("Title,Price,Status\nA,abc,pending").issues;
  assert.equal(issues.length, 2);
});
