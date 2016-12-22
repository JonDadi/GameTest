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

const app = express();
const server = http.createServer(app);
const io = require('socket.io').listen(server);

const funct = require('./functions.js'); //funct file contains our helper functions for our Passport and database work

// Passport session setup.
passport.serializeUser((user, done) => {
  console.log("serializing " + user);
  done(null, user);
});

passport.deserializeUser((user, done) => {
  console.log("deserializing " + user);
  done(null, user);
});

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
    funct.localReg(username, password)
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
  connectedPlayers[socket.id] = {};
  // We can now use the socket in this array to send to this client.
  connectedPlayers[socket.id].socket = socket;
  // Assign a temp username if the player does not provide one.
  connectedPlayers[socket.id].userName = 'Anon'+numPlayers;
  //Ask the client to send us info
//  socket.emit('sendInfo');
  //The response from the client with the info.
  socket.on('getInfo', info => {
    const oldName = connectedPlayers[socket.id].userName;
    connectedPlayers[socket.id].userName = info.userName;
    io.emit('announcement', oldName+' just changed his userName to '+info.userName);
  });

  // Increment the player counter because a new player just connected.
  numPlayers++;

  if(numPlayers === 1){
    //Announce that the game is waiting on new players
    io.emit('announcement', 'Waiting for more players...')
  }
  // If the number of players is 2 then we can start a new game.
  else if(numPlayers === 2){
    // Tell clients to prep for a new game
    io.emit('newGame');
    // Announce the game start.
    io.emit('announcement', 'We got 2 players, a game will start now! First player is: '+
            connectedPlayers[socket.id].userName);
    // Pick a socket that gets to draw first.  It should pick a random socket
    // but currently it picks the second socket to join the game.
    socket.emit('yourTurn', wordToGuess);

  }
  else{
    // If the players are more than 2, then just announce when
    // a new player has connected
    io.emit('announcement', connectedPlayers[socket.id].userName+' just joined the game!');
  }

  // Someone send a new message
  socket.on('userMsg', (msg) => {
    // Broadcast the message to all other clients
    io.emit('newMsg', connectedPlayers[socket.id].userName+': '+msg);
    // Check if message is the correct answer
    if(msg.toLowerCase() === wordToGuess){
      // Announce the winner
      io.emit('announcement', 'Correct answer!, '+connectedPlayers[socket.id].userName+' \
              guessed the correct answer and gets to draw!');
      // Tell all clients to start a new game
      io.emit('newGame');
      // Send the socket that guessed correct a new word to draw.
      socket.emit('yourTurn', wordToGuess);
    }

  })

  // Get the lines from the drawing client
  socket.on('lines', lines => {
    // Send the lines to all other clients
    socket.broadcast.emit('drawLine', lines);
  })

  // Do something when a client disconnects
  socket.on('disconnect', () => {
    console.log('A user disconnected');
    numPlayers--;
    // Announce other players that a player has disconnected
    io.emit('announcement', connectedPlayers[socket.id].userName+' disconnected.');
    if(numPlayers === 1){
      // If a player disconnects leaving only one behind then the game will stop
      // and the player is notified that the game needs more players.
      io.emit('announcement', 'Waiting for more players...');
    }
  })
})

module.exports = app;
