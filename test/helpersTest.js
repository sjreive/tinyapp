const { assert } = require('chai');

const { emailLookupHelper } = require('../helpers.js');

const testUsers = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};

const dataEntered1 = {
  id: "dataEntered1",
  email: "user@example.com",
  password: "purple-monkey-dinosaur"
};

const dataEntered2 = {
  id: "dataEntered2",
  email: "user7@example.com",
  password: "purple-monkey-dinosaur"
};

describe('emailLookupHelper', function() {
  it('should return a user with valid email', function() {
    const user = emailLookupHelper(testUsers, dataEntered1);
    const expectedOutput = "userRandomID";
    assert.strictEqual(user, expectedOutput);
  });

  it('should return undefined when email is non existant', function() {
    const user = emailLookupHelper(testUsers, dataEntered2);
    const expectedOutput = undefined;
    assert.strictEqual(user, expectedOutput);
  });
});