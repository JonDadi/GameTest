/* SERVER VARIABLES */
const express = require('express');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const path = require('path');
const http = require('http');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const db = require('./dbConnect');
const game = require('./game');
const sharedsession = require("express-socket.io-session");


const app = express();
const server = http.createServer(app);
const io = require('socket.io').listen(server);


const funct = require('./functions.js'); //funct file contains our helper functions for our Passport and database work

// This is just a placeholder variable when testing the game,
// this variable will be an instance of the game prototype.  In the future it might be
// best to have all games stored in an array of game prototype object, by doing that
// we can have more than 2 users battling each other at the same time.
let game1 = {};

// Passport session setup.
passport.serializeUser((user, done) => {
  console.log("serializing " + user);
  done(null, user);
});

passport.deserializeUser((user, done) => {
  console.log("deserializing " + user);
  done(null, user);
});

io.use(sharedsession(session({secret: 'supernova', saveUninitialized: true, resave: true})));


//app.use(logger('combined'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'supernova', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());

// Session-persisted message middleware
app.use((req, res, next) => {
  let err = req.session.error;
  let msg = req.session.notice;
  let success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
});

app.set('port', 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));

server.listen(process.env.PORT || 3000);

app.get('/', (req, res) => {
  res.render('home', {user: req.user});
});

// Unauthenticated users are not allowed to access the index page
app.get('/index', (req, res) => {
  if (req.isAuthenticated()) {
    res.cookie('userName', req.user.username, { maxAge: 900000, httpOnly: true });
    res.cookie('sessionID', req.sessionID, { maxAge: 900000, httpOnly: true });
    res.render('index', {user: req.user});
  } else {
    req.session.error = 'Please sign in!';
    res.redirect('/signin');
  }
});

//displays our signup page
app.get('/signin', (req, res) => {
  db.createTables();
  res.render('signin');
});

// sends the request through our local signup strategy, and if successful takes user to game,
// otherwise returns to signin page
app.post('/local-reg', passport.authenticate('local-signup', {
  successRedirect: '/index',
  failureRedirect: '/signin'
  })
);

// sends the request through our local login/signin strategy, and if successful takes user to game,
// otherwise returns to signin page
app.post('/login', passport.authenticate('local-signin', {
  successRedirect: '/index',
  failureRedirect: '/signin'
  })
);

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', (req, res) => {
  const name = req.user.username;
  console.log("LOGGIN OUT " + req.user.username)
  req.logout();
  res.redirect('/');
  req.session.notice = "You have successfully been logged out " + name + "!";
});


// Use the LocalStrategy within Passport to register/"signup" users.
passport.use('local-signup', new LocalStrategy(
  {passReqToCallback : true}, //allows us to pass back the request to the callback
  (req, username, password, done) => {
    funct.localReg(username, password, req.body.email)
    .then((user) => {
      if (user) {
        console.log("REGISTERED: " + user.username);
        req.session.success = 'You are successfully registered and logged in ' + user.username + '!';
        done(null, user);
      }
      if (!user) {
        console.log("COULD NOT REGISTER");
        req.session.error = 'That username is already in use, please try a different one.'; //inform user could not log them in
        done(null, user);
      }
    })
    .fail((err) => {
      console.log(err.body);
    });
  }
));

// Use the LocalStrategy within Passport to login/"signin" users.
passport.use('local-signin', new LocalStrategy(
  {passReqToCallback : true}, //allows us to pass back the request to the callback
  (req, username, password, done) => {
    funct.localAuth(username, password)
    .then((user) => {
      if (user) {
        console.log("LOGGED IN AS: " + user.username);
        req.session.success = 'You are successfully logged in ' + user.username + '!';
        done(null, user);
      }
      if (!user) {
        console.log("COULD NOT LOG IN");
        req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
        done(null, user);
      }
    })
    .fail((err) => {
      console.log(err.body);
    });
  }
));

/* GAME VARIABLES */
const connectedPlayers = [];
const wordToGuess = 'penus';
let numPlayers = 0;
let activePlayer = '0';


// When a client connects to our server.
io.on('connection', socket => {
  console.log('user connected!');

  // Get the cookies from this socket.
  const cookie=socket.handshake.cookies;


  connectedPlayers[socket.id] = {};
  // We can now use the socket in this array to send to this client.
  connectedPlayers[socket.id].socket = socket;
  // Get the username from a cookie.
  connectedPlayers[socket.id].userName = cookie.userName;
  // Get the sessionID from a cookie.
  connectedPlayers[socket.id].sessionID = cookie.sessionID;
  // Assign a playerID to each user.  This will be replaced with session id in the future.
  // We would need to load that from a cookie.
  connectedPlayers[socket.id].userID = numPlayers;
    // Increment the player counter because a new player just connected.
  numPlayers++;

  // If the number of players is 2 then we can start a new game.
  if(numPlayers === 2){

    // Tell clients to prep for a new game
    io.emit('newGame');
    // Create a new game that the 2 connected players will compete in.  Currently it's only
    // possible to have 2 players play at once.  An array of games will be better in the future.
    game1 = new game.Game();
    // Tell the second player that it is his turn.  (Maybe change to random player later)
    socket.emit('yourTurn');
    // Announce the game start.
    io.emit('announcement', 'We got 2 players, a game will start now! First player is: '+
            connectedPlayers[socket.id].userName);
    // Pick a socket that gets to draw first.  It should pick a random socket
    // but currently it picks the second socket to join the game.
  }

  socket.on('sendTurn', move => {
    console.log(move.column);

    // The variable isWon keeps track of if a player has won yet.  If this turns true then
    // the socket sending the new move is the winner.
    let isWon = game1.makeMove(move.row, move.column, connectedPlayers[socket.id].userID);
    if (isWon) {
      // Let the players know who won,  the players will then clear the board and start a new game
      // when they recieve these messages.
      // (socket.emit broadcasts to the user that played the last move)
      // (socket.broadcast.emit) broadcasts to the losing player.
      socket.emit('youWon');
      io.emit('announcement', connectedPlayers[socket.id].userName + ' just won!')
      socket.broadcast.emit('youLost');
    }
    else {
      // No one won so the game continues.
      socket.broadcast.emit('enemyTurn', move.column);
      socket.broadcast.emit('yourTurn');
    }
  });

  // Someone send a new message
  socket.on('userMsg', (msg) => {
    // Broadcast the message to all other clients
    io.emit('newMsg', connectedPlayers[socket.id].userName+': '+msg);
  })

  // Do something when a client disconnects
  socket.on('disconnect', () => {
    console.log('A user disconnected');

    // save the userinfo to database.




    numPlayers--;
    // Announce other players that a player has disconnected
    io.emit('announcement', connectedPlayers[socket.id].userName+' disconnected.');
  })
})

module.exports = app;
