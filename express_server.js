
const express = require("express");
const app = express();
const PORT = 8080; //default port 8080
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.set("view engine", "ejs");

const urlDatabase = {
  "b2xVn2" : "http://www.lighthouselabs.ca",
  "9sm5xK" : "http://www.google.com"
};

const users = {
  Uk78A: {
    id: 'Uk78A',
    email: 'sarahjreive@gmail.com',
    password: 'password123',
  }
};

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

// This function used to check if registering email already exists in the database. Also checks if password and emails fields are blank.
const emailLookupHelper = function (users, newUser) { 
  if (newUser.email === "" || newUser.password === "") {
    return false;
  }
  for (let user in users) {
    if (users[user].email === newUser.email) {
      return false;
    }
  }
  return true;
};


app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase, username: req.cookies.username };
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`);
});

app.get("/register", (req, res) => {
  let templateVars = { urls: urlDatabase, username: req.cookies.username };
  res.render("urls_register", templateVars);
});

app.post("/register", (req, res) => {
  let newUser = new User(req.body.email, req.body.password);
  if (emailLookupHelper(users, newUser)) {
    users[newUser.id] = newUser;
    res.cookie('username', newUser.id);
    res.redirect('/urls');
  } else {
    res.statusCode = 400;
    res.end(`Error ${res.statusCode}, Bad Request- server cannnot process registeration info!`);
  }

  console.log(users);
});

app.get("/urls/new", (req, res) => {
  let templateVars = { urls: urlDatabase, username: req.cookies.username };
  res.render("urls_new", templateVars); //passes data to the urls_new view template
});

app.post("/login", (req, res) => {
  res.cookie('username', req.body.username);
  res.redirect('/urls'); // don't need to render because get route for /urls will render the required data.
  
});

app.post("/logout", (req, res) => {
  console.log(req.body);
  res.cookie('username', "");
  res.redirect('/urls'); // don't need to render because get route for /urls will render the required data.
});

app.get("/urls/:shortURL", (req, res) => {
  let templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL], username: req.cookies.username };
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req,res) => {
  const longURL = urlDatabase[req.params.shortURL];
  console.log("req.params:", req.params);
  console.log("longURL", longURL);
  res.redirect(`${longURL}`); //// CHECK IF USER HAS ADDED HTTP
});

app.post("/urls/:id", (req, res) => {
  urlDatabase[req.params.id] = req.body.longURL;
  console.log(urlDatabase);
  res.redirect(`/urls/${req.params.id}`);
});

app.post("/urls/:shortURL/delete", (req, res) => { //using javascript's delete operator to remove url
  delete urlDatabase[req.params.shortURL];
  res.redirect("/urls/");
  
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

