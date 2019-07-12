// Importing modules
const express = require("express");
const app = express();
const PORT = 8080; //default port 8080
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const methodOverride = require('method-override');

//Require helper functions:
const {
  generateRandomString,
  emailLookupHelper,
  loginHelper,
  validateReg,
  filterURLs
} = require('./helpers');

// Initializing modules
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: ['blah'],
}));
app.use(methodOverride('_method'));
app.set("view engine", "ejs");

// DATABASES & CLASSES

// URL Database
const urlDatabase = {};

// URL Database class & constructor function invoked upon creation of a new short URL
class urlDatabaseEntry {
  constructor(longURL, userID) {
    this.longURL = longURL;
    this.userID = userID;
    this.date = new Date(); //generates timestamp upon creation
    this.count = 0; // increments whenever the link is visited
    this.visitors = []; // array to hold ids of all unique vistors;
    this.log = {}; // object to hold visitor ID & timestamp for every visit to this short URL
  }
}

// User Database
const users = {};

// User class & constructor function invoked upon registration of a new user
class User {
  constructor(email, password) {
    this.id = generateRandomString();
    this.email = email;
    this.password = password;
  }
}

// Visit class & constructor function invoked every time a shortURL is visted
class Visit {
  constructor(visitorID) {
    this.visitorID = visitorID;
    this.date = new Date();
  }
}

// if user is logged in, redirect to /urls. If they are not logged in, redirect to /login
app.get("/", (req, res) => {
  if (req.session.user_id) {
    res.redirect('/urls');
  } else {
    res.redirect('/login');
  }
});

//If user is logged in, this route will render a table of all short URLs created by them. If not logged in, will redirect to login
app.get("/urls", (req, res) => {
  if (req.session.user_id) {
    let userUrlDatabase = filterURLs(urlDatabase, req);
    let templateVars = { urls: userUrlDatabase, user : users[req.session.user_id] };
    res.render("urls_index", templateVars);
  } else {
    res.redirect('/login');
  }
});

// User can create a new short URL. Will add to urlDatabase & redirect to that short URLs page
app.post("/urls", (req, res) => {
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = new urlDatabaseEntry(req.body.longURL, req.session.user_id);
  res.redirect(`/urls/${shortURL}`);
});

// If user is not logged in, login view is display. If they are already logged in, redirect to /urls.
app.get("/login", (req, res) => {
  if (req.session.user_id) {
    res.redirect('/urls');
  }
  let templateVars = { urls: urlDatabase, user : users[req.session.user_id] };
  res.render("urls_login", templateVars);
});

// If user is not logged in they can register. If they are already logged in, redirect to /urls
app.get("/register", (req, res) => {
  if (req.session.user_id) {
    res.redirect('/urls');
  }
  let templateVars = { urls: urlDatabase, user : users[req.session.user_id] };
  res.render("urls_register", templateVars);
});

// User can register with an email that does not already exist in the user database and a  valid (ie not empty) password. Password is encrypted with bcrypt.
app.post("/register", (req, res) => {
  
  if (req.body.password === "") {
    res.statusCode = 400;
    let templateVars = { urls: urlDatabase, user: users[req.session.user_id], errorStatusCode: res.statusCode, errorMessage: "Bad Request. So Bad." };
    res.render("urls_error", templateVars);
    res.render(`Error ${res.statusCode}, Bad Request- server cannnot process registeration info!`);
  }
  const hashedPassword = bcrypt.hashSync(req.body.password, 10);
  let newUser = new User(req.body.email, hashedPassword);
  
  // checking credentials entered by new user for validity & either redirecting to /urls or error page.
  if (!(emailLookupHelper(users, newUser)) && validateReg(newUser)) {
    users[newUser.id] = newUser;
    req.session.user_id = newUser.id;
    req.session.save();
    res.redirect('/urls');
  } else {
    res.statusCode = 400;
    let templateVars = { urls: urlDatabase, user: users[req.session.user_id], errorStatusCode: res.statusCode, errorMessage: "Bad Request. So Bad." };
    res.render("urls_error", templateVars);
    res.render(`Error ${res.statusCode}, Bad Request- server cannnot process registeration info!`);
  }
});

// If user is logged in, displays view with form to create new short URL. If they are not logged in, redirects to /login
app.get("/urls/new", (req, res) => {
  if (req.session.user_id) {
    let templateVars = { urls: urlDatabase, user : users[req.session.user_id] };
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

// If user provides valid login credentials, set cookie with user id info & redirect to /urls. If not, render error view.
app.post("/login", (req, res) => {
  if (loginHelper(users,req.body)) {
    req.session.user_id = emailLookupHelper(users,req.body);
    req.session.save();
    res.redirect('/urls');
  } else {
    res.statusCode = 403;
    let templateVars = { urls: urlDatabase, user: users[req.session.user_id], errorStatusCode: res.statusCode, errorMessage: "Forbidden! You shall not pass." };
    res.render("urls_error", templateVars);
  }
});

// When user logs out, set user session cookie to null and redirect to /urls
app.post("/logout", (req, res) => {
  req.session.user_id = null;
  res.redirect('/urls');
});

// If User created the short URL they are trying to access, render show view. If not, render error view.
app.get("/urls/:shortURL", (req, res) => {
  if (filterURLs(urlDatabase, req)[req.params.shortURL]) {
    let templateVars = { urls: urlDatabase, shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL].longURL, user : users[req.session.user_id] };
    res.render("urls_show", templateVars);
  } else {
    res.statusCode = 403;
    let templateVars = { urls: urlDatabase, user: users[req.session.user_id], errorStatusCode: res.statusCode, errorMessage: "Forbidden! You shall not pass." };
    res.render("urls_error", templateVars);
  }
});

// User can visit the long URL via the short URL.
app.get("/u/:shortURL", (req,res) => {

  // check if shortURL exists in the database. Otherwise render error view.
  if (urlDatabase[req.params.shortURL]) {
    const longURL = urlDatabase[req.params.shortURL].longURL;
    urlDatabase[req.params.shortURL].count += 1; // adds to count of times page visited
    
    // if the browser does not have a session cookie for this short URL, request session cookie
    if (!req.session.page_view) {
      req.session.page_view = generateRandomString();
      req.session.save();
    }
    // if this browser (or "session") has not visited this short URL before, add it to the array of visitors.
    if (!(urlDatabase[req.params.shortURL].visitors.includes(req.session.page_view))) {
      urlDatabase[req.params.shortURL].visitors.push(req.session.page_view);
    }
    // check if a user is logged in; if so, use their email as ID in vistor's log. Otherwise, use randomly assigned visitor id (from cookie)
    if (req.session.user_id) {
      urlDatabase[req.params.shortURL].log[generateRandomString()] = new Visit(users[req.session.user_id].email); // push their user id to the log in the url database
    } else {
      urlDatabase[req.params.shortURL].log[generateRandomString()] = new Visit(`Guest: ${req.session.page_view}`); // use session id of guest in log instead
    }
    res.redirect(`${longURL}`);
  } else {
    res.statusCode = 404;
    let templateVars = { urls: urlDatabase, user: users[req.session.user_id], errorStatusCode: res.statusCode, errorMessage: "Not Found. That's not a thing!" };
    res.render("urls_error", templateVars);
  }
});

// User can edit the long URL of short URLs that belong to them. Put request via method override. If short URL doesn't belong to them, render error view.
app.put("/urls/:shortURL", (req, res) => {
  if (filterURLs(urlDatabase, req)[req.params.shortURL]) {
    urlDatabase[req.params.shortURL].longURL = req.body.longURL;
    res.redirect('/urls');
  } else {
    res.statusCode = 403;
    let templateVars = { urls: urlDatabase, user: users[req.session.user_id], errorStatusCode: res.statusCode, errorMessage: "Forbbiden! You shall not pass." };
    res.render("urls_error", templateVars);
  }
});

// User can delete the long URL of short URLs that belong to them. Delete request via method override. If short URL doesn't belong to them, render error view.
app.delete("/urls/:shortURL/delete", (req, res) => {
  if (filterURLs(urlDatabase, req)[req.params.shortURL]) {
    console.log("DELETING!!");
    delete urlDatabase[req.params.shortURL]; //use javascript's delete operator to remove url
    res.redirect("/urls");
  } else {
    res.statusCode = 403;
    let templateVars = { urls: urlDatabase, user: users[req.session.user_id], errorStatusCode: res.statusCode, errorMessage: "Forbbiden! You shall not pass." };
    res.render("urls_error", templateVars);
  }
  
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

