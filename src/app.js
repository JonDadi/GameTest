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

  // Check if the sessionID stored in cookie is the same as the current
  // sessionID,  if so let the user in without a log in prompt.
  if(req.cookies.sessionID === req.sessionID){
    res.render('index', {user: req.user});
  }
  else {
    res.render('home', {user: req.user});
  }
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
  // Clear the sessionID cookie so the user can actually logout.
  res.clearCookie('sessionID');
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
const playersInQueue = [];
const activeGames = [];
let gameID = 0;
let numPlayers = 0;
let activePlayer = '0';

// Check if a player is in the connectedPlayers array.
function isUserInPlayers( userName ){
  for(socketId in connectedPlayers){
    if(connectedPlayers[socketId].userName === userName) return socketId;
  }
  return false;
}

// Updates the connectedPlayers array if a logged in user
// refreshes the page and gets a new socket.
function updateUserSocket(userName, newSocket){
  let oldSocketId;
  // Find the old socketId
  for( socketId in connectedPlayers ){
    if(connectedPlayers[socketId].userName === userName){
      oldSocketId = socketId;
    }
  }
  // Get the old player object.
  const player = connectedPlayers[oldSocketId];

  // Create a new entry in the connectedPlayers array using the
  // information from the old entry.
  let updatedPlayer = player;
  // Put the new socket instead of the old one
  updatedPlayer.socket = newSocket;
  // Add the updated player to the array
  connectedPlayers[newSocket.id] = updatedPlayer;
  // Delete the old entry.
  connectedPlayers.splice(oldSocketId, 1);

}

// When a client connects to our server.
io.on('connection', socket => {
  console.log('user connected!');

  // Get the cookies from this socket.
  const cookie=socket.handshake.cookies;

  // Check if the user was previously logged in.
  if(isUserInPlayers(cookie.userName)){
    console.log('old user connected! Updating connectedPlayers array!');
    updateUserSocket(cookie.userName, socket);
    // If the user was not in game then tell him to wait for an opponent;
    if(!connectedPlayers[socket.id].gameID){
      // Find where the player was in playersInQeueu array and update the socket.
      for(i in playersInQueue){
        if(playersInQueue[i].userName === cookie.userName){
          playersInQueue[i].socket = socket;
          break;
        }
      }
      // Tell the player he is waiting for opponent..
      socket.emit('waiting');
    }
  }
  else{
    console.log('new user connected! Inserting him into connectedPlayers array!');
    // A new user has connected that was not in connectedPlayers array.
    connectedPlayers[socket.id] = {};
    // We can now use the socket in this array to send to this client.
    connectedPlayers[socket.id].socket = socket;
    // Get the username from a cookie.
    connectedPlayers[socket.id].userName = cookie.userName;
    // Add the joining user to the queue,  this makes him available to join games.
    playersInQueue.push( {'userName': cookie.userName,
                          'socket': socket});
    // Tell the socket he has not yet started a game.
    socket.emit('waiting');
    // Increment the player counter because a new player just connected.
    numPlayers++;
  }


    // If the number of players is 2 then we can start a new game.
    if(playersInQueue.length > 1){
      const player1Socket = playersInQueue.pop().socket;
      const player2Socket = playersInQueue.pop().socket;
      const player1 = connectedPlayers[player1Socket.id].userName;
      const player2 = connectedPlayers[player2Socket.id].userName;
      connectedPlayers[player1Socket.id].gameID = gameID;
      connectedPlayers[player2Socket.id].gameID = gameID;

      player1Socket.join('game'+gameID);
      player2Socket.join('game'+gameID);

      const activeGame = {'game': new game.Game(player1, player2),
                          'player1': player1,
                          'player2': player2,
                          'player1Socket': player1Socket,
                          'player2Socket': player2Socket,
                          'dbId': null};

      db.createMatch(player1, player2, null, activeGame.game.gameBoard) // (player1, player2, winner, grid)
      .then((result) => {
        activeGame.dbId = result[0].id; // get the db ID of the match
      });

      activeGames[gameID] = activeGame;

      io.to('game'+gameID).emit('newGame');
      io.to('game'+gameID).emit('announcement', 'In this game '+player1+
                                ' and ' + player2 + ' will compete!');
      io.to('game'+gameID).emit('announcement', player1+' starts!');
      player1Socket.emit('yourTurn');

      gameID++;
    }

  socket.on('sendTurn', move => {

    // Find what game the player is playing in.
    const gameID = connectedPlayers[socket.id].gameID;
    const activeGame = activeGames[gameID];

    let enemySocket;
    // Find the socketID of other player in the game.  This socketID is then used to
    // send the move to the other player.
    if(socket.id === activeGame.player1Socket.id){
        enemySocket = activeGame.player2Socket;
    }
    else{
        enemySocket = activeGame.player1Socket;
    }

    // The variable isWon keeps track of if a player has won yet.  If this turns true then
    // the socket sending the new move is the winner.
    let isWon = activeGame.game.makeMove(move.row, move.column, connectedPlayers[socket.id].userName);
    db.updateMatchBoard(activeGame.game.gameBoard, activeGame.dbId)
    .then((result) => {
      console.log("Board updated");
    });

    let draw = false;
    if(isWon === -1){
      draw = true;
      io.to('game'+gameID).emit('announcement', 'There was a draw!');
    }
    // if an array of length 2 was returned from the makeMove function call above and
    // a winning condition was fulfilled
    if (isWon.length > 1 && isWon[0]) {
      db.updateMatchWinner(connectedPlayers[socket.id].userName, isWon[1], activeGame.dbId)
      .then((result) => {
        console.log("DB has been updated with name of winner: "+connectedPlayers[socket.id].userName);
      });
      // Let the players know who won,  the players will then clear the board and start a new game
      // when they recieve these messages.
      // (socket.emit broadcasts to the user that played the last move)
      // (socket.broadcast.emit) broadcasts to the losing player.
      io.to('game'+gameID).emit('newGame'); 
      io.to('game'+gameID).emit('announcement', connectedPlayers[socket.id].userName + ' just won!');
      socket.emit('youWon');
      enemySocket.emit('yourTurn');
    }

    if(!isWon[0] && !draw){
      // No one won so the game continues.
      enemySocket.emit('enemyTurn', move.column);
      enemySocket.emit('yourTurn');
    }
  });

  // Someone send a new message
  socket.on('userMsg', (msg) => {
    // Find the game id of the game the socket is in.  We then Broadcast
    // to that socket.io room.
    const gameID = connectedPlayers[socket.id].gameID;
    // Broadcast the message to the other players.
    io.to('game'+gameID).emit('newMsg', connectedPlayers[socket.id].userName+': '+msg);
  })

  // Do something when a client disconnects
  socket.on('disconnect', () => {
    console.log('A user disconnected');






    numPlayers--;
    // Announce other players that a player has disconnected
    //io.emit('announcement', connectedPlayers[socket.id].userName+' disconnected.');
  })
})

module.exports = app;
