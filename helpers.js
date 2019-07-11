// This file contains all the helper functions.

// This function generates a random 5 character string used to generate unique user id & short URL
const generateRandomString = function() {
  const charString = "0123456789abcdefghijklmnopqrskutwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const stringLength = 5;
  let randString = "";
  for (let i = 0; i < stringLength; i++) {
    let randChar = Math.floor(Math.random() * charString.length);
    randString += charString[randChar];
  }
  return randString;
};

// This function used to check if registering email already exists in the database.
const emailLookupHelper = function(users, newUser) {
  for (let user in users) {
    console.log('User:', users[user].email, 'login email:', newUser.email);
    if (users[user].email === newUser.email) {
      return user;
    }
  }
  return false;
};

// This function checks if the email & password provided by the user match the username & password in the database
const loginHelper = function(users, loginData) {
  for (let user in users) {
    console.log('User:', users[user].password, 'login password:', loginData.password);
    if (users[user].email === loginData.email && bcrypt.compareSync(loginData.password, users[user].password)) {
      return true;
    }
  }
  return false;
};

// This function is used to check if email & password fields are empty.
const validateReg = function(newUser) {
  if (newUser.email === "" || newUser.password === "") {
    return false;
  } else {
    return true;
  }
};

//This function filters the URLS visible to user
const filterURLs = function(urlDatabase, req) {
  let userUrlDatabase = {};
  for (let shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === req.session.user_id) {
      userUrlDatabase[shortURL] = urlDatabase[shortURL];
    }
  }
  return userUrlDatabase;
};



module.exports = {
  generateRandomString,
  emailLookupHelper,
  loginHelper,
  validateReg,
  filterURLs
};