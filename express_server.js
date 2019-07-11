const express = require("express");
const app = express();
const PORT = 8080; //default port 8080
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: ['blah'],
  // Cookie Options
}));

app.set("view engine", "ejs");

const urlDatabase = {
  "b2xVn2" : { longURL: "http://www.lighthouselabs.ca", userID: "Uk78A" },
  "9sm5xK" : { longURL: "http://www.google.com", userID: "Uk78A" }
};

class urlDatabaseEntry {
  constructor(longURL, userID) {
    this.longURL = longURL;
    this.userID = userID;
  }
}

const users = {};

class User {
  constructor(email, password) {
    this.id = generateRandomString();
    this.email = email;
    this.password = password;
  }
}

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

// if user is logged in, redirect to /urls. If they are not logged in, redirect to /login
app.get("/", (req, res) => {
  if (req.session.user_id) {
    res.redirect('/urls');
  } else {
    res.redirect('/login');
  }
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  console.log("session user id for get /urls:",req.session);
  let userUrlDatabase = filterURLs(urlDatabase, req);
  console.log(users);
  let templateVars = { urls: userUrlDatabase, user : users[req.session.user_id] };
  
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  console.log(req.session);
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = new urlDatabaseEntry(req.body.longURL, req.session.user_id);
  res.redirect(`/urls/${shortURL}`);
});

app.get("/register", (req, res) => {
  if (req.session.user_id) { //if user is already logged in, redirect to /urls 
    res.redirect('/urls');
  }
  let templateVars = { urls: urlDatabase, user : users[req.session.user_id] };
  res.render("urls_register", templateVars);
});

app.post("/register", (req, res) => {
  const hashedPassword = bcrypt.hashSync(req.body.password, 10); //hash password using bcrypt
  console.log(hashedPassword);
  req.body.password = hashedPassword;
  let newUser = new User(req.body.email, hashedPassword); //pass user input email & hashed password to newUser constructor function
  if (!(emailLookupHelper(users, newUser)) && validateReg(newUser)) {
    users[newUser.id] = newUser;
    req.session.user_id = newUser.id;
    req.session.save();
    res.redirect('/urls');
  } else {
    res.statusCode = 400;
    res.end(`Error ${res.statusCode}, Bad Request- server cannnot process registeration info!`); ///
  }
  console.log('after registration session info:', req.session);
});

app.get("/login", (req, res) => {
  if (req.session.user_id) { //if user is already logged in, redirect to /urls 
    res.redirect('/urls');
  }
  let templateVars = { urls: urlDatabase, user : users[req.session.user_id] };
  res.render("urls_login", templateVars);
});


app.get("/urls/new", (req, res) => {
  if (req.session.user_id) { // if user is logged in, render page to allow them to create tiny URL
    let templateVars = { urls: urlDatabase, user : users[req.session.user_id] };
    res.render("urls_new", templateVars); //passes data to the urls_new view template
  } else { // if user is not logged in, redirect them to the login page
    res.redirect("/login");
  }
});

app.post("/login", (req, res) => {
  if (loginHelper(users,req.body)) {
    req.session.user_id = emailLookupHelper(users,req.body);
    req.session.save();
    res.redirect('/urls');
  } else {
    res.statusCode = 403;
    res.end(`Error ${res.statusCode}, Forbidden! You are not allowed to access this page.`);
  }
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect('/urls');
});
app.get("/urls/:shortURL", (req, res) => {
  if (filterURLs(urlDatabase, req)[req.params.shortURL]) {
    let templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL].longURL, user : users[req.session.user_id] };
    res.render("urls_show", templateVars);
  } else {
    res.send("ERROR! You're not allowed to see this Tiny URL.");
  }
});

app.get("/u/:shortURL", (req,res) => {
  if (urlDatabase[req.params.shortURL]) { //if shortURL exists in the database
    const longURL = urlDatabase[req.params.shortURL].longURL;
    console.log("req.params:", req.params);
    console.log("longURL", longURL);
    res.redirect(`${longURL}`); //// CHECK IF USER HAS ADDED HTTP
  } else {
    res.send("ERROR! That Tiny URL does not exist.");
  }
});

app.post("/urls/:shortURL", (req, res) => {
  urlDatabase[req.params.shortURL].longURL = req.body.longURL;
  console.log(urlDatabase);
  res.redirect('/urls');
});

app.post("/urls/:shortURL/delete", (req, res) => { //using javascript's delete operator to remove url
  if (filterURLs(urlDatabase, req)[req.params.shortURL]) { //if user is logged in and has authority to delete this shortURL (ie it is in their database), delete;
    console.log("DELETING!!");
    delete urlDatabase[req.params.shortURL];
  } else { // if user has a
    res.send('CANNOT DELETE THIS RESOURCE!');
  }
  res.redirect("/urls");
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

