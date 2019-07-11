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

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: ['blah'],
}));

app.set("view engine", "ejs");

app.use(methodOverride('_method'));

const urlDatabase = {}; // This object will hold all url database entries (short URLS created)

class urlDatabaseEntry {
  constructor(longURL, userID) {
    this.longURL = longURL;
    this.userID = userID;
    this.date = new Date(); //generates timestamp upon creation of each new short URL
    this.count = 0; // This will increment whenever the link is visited
    this.visitors = []; //This array will hold list of all registered users who have visited this link & timestamp of visit;
    this.log = {};
  }
}

const users = {}; // This object will hold all instances of users

class User {
  constructor(email, password) {
    this.id = generateRandomString();
    this.email = email;
    this.password = password;
  }
}

class Visit {
  constructor(visitorID) { // This constructor is used to create instance of visit to tinyURL
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
  urlDatabase[shortURL] = new urlDatabaseEntry(req.body.longURL, req.session.user_id); // add new ShortURL to urlDatabase
  
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
  if (!(emailLookupHelper(users, newUser)) && validateReg(newUser)) { //check that password & email fields are not empty, and that email does not already exist in the database
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
  req.session.user_id = null;
  res.redirect('/urls');
});
app.get("/urls/:shortURL", (req, res) => {
  if (filterURLs(urlDatabase, req)[req.params.shortURL]) {
    let templateVars = { urls: urlDatabase, shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL].longURL, user : users[req.session.user_id] };
    res.render("urls_show", templateVars);
  } else {
    res.send("ERROR! You're not allowed to see this Tiny URL.");
  }
});

app.get("/u/:shortURL", (req,res) => {
  
  // check if shortURL exists in the database. 
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

    // check if a user is logged in; if so, use their email as ID in vistor's log. Otherwise, use randomly assigned visitor id (from cookie)
    if (req.session.user_id) { 
      urlDatabase[req.params.shortURL].log[generateRandomString()] = new Visit(users[req.session.user_id].email); // push their user id to the log in the url database
    } else {
      urlDatabase[req.params.shortURL].log[generateRandomString()] = new Visit(`Guest: ${req.session.page_view}`); // use session id of guest in log instead
    }

    
    console.log(urlDatabase[req.params.shortURL].log);
    res.redirect(`${longURL}`);
  } else {
    res.send("ERROR! That Tiny URL does not exist.");
  }
});

app.put("/urls/:shortURL", (req, res) => {
  urlDatabase[req.params.shortURL].longURL = req.body.longURL; // add the shortURL & corresponding longURL to the url database.
  console.log(req.params);
  res.redirect('/urls');
});

app.delete("/urls/:shortURL/delete", (req, res) => { //use method-override in order to complete DELETE request
  if (filterURLs(urlDatabase, req)[req.params.shortURL]) { //if user is logged in and has authority to delete this shortURL (ie it is in their database), delete;
    console.log("DELETING!!");
    delete urlDatabase[req.params.shortURL]; //use javascript's delete operator to remove url
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

