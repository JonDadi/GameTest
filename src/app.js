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
const playerController = require('./playerController');

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
const activeGames = [];
let gameID = 0;
// When a client connects to our server.
io.on('connection', socket => {
  console.log('user connected!');

  // Get the cookies from this socket.
  const cookie = socket.handshake.cookies;
  const userName = cookie.userName;

  playerController.setPlayerOnline(userName, socket);
  ///playerController.setPlayerIntoQueue( userName );

  // Send the currently online users to all sockets.
  io.emit('updatePlayerList', playerController.getOnlinePlayers());

  socket.on('enterQueue', () => {
    const socketUserName = playerController.getUserNameBySocketID(socket.id);
    playerController.setPlayerIntoQueue( socketUserName );

    // If the number of players is 2 then we can start a new game.
    if(playerController.getNumPlayersInQueue() > 1){
      const player1 = playerController.getPlayerFromQueue();
      const player2 = playerController.getPlayerFromQueue();
      const player1Socket = player1.socket;
      const player2Socket = player2.socket;

      // Tell the playerController that these players will join a game.
      playerController.playerJoinGame(player1.userName, gameID);
      playerController.playerJoinGame(player2.userName, gameID);
      // Make the player sockets join a room so they can talk in private.
      player1Socket.join('game'+gameID);
      player2Socket.join('game'+gameID);

      const activeGame = {'game': new game.Game(player1.userName, player2.userName),
                          'player1': player1,
                          'player2': player2,
                          'dbId': null};

      db.createMatch(player1.userName, player2.userName, null, activeGame.game.gameBoard) // (player1, player2, winner, grid)
      .then((result) => {
        activeGame.dbId = result[0].id; // get the db ID of the match
      });

      let score1 = 0;
      let score2 = 0;
      // Have to have this whole thing under '.then' because of the promise behavior. If the 'emits'
      // are outside of the promise, score1 and score2 won't get updated and will always remain 0
      db.getScores(player1, player2)
      .then((result) => {
        score1 = result[0].winsplayer1;
        score2 = result[0].winsplayer2;
        io.to('game'+gameID).emit('displayScores', player1, player2, score1, score2);

        io.to('game'+gameID).emit('newGame');
        io.to('game'+gameID).emit('announcement', 'In this game '+player1+
                                  ' and ' + player2 + ' will compete!');
        io.to('game'+gameID).emit('announcement', player1+' starts!');

        player1Socket.emit('yourTurn');

        gameID++;
      });
    }


  });

  socket.on('sendTurn', move => {

    // Find what game the player is playing in.
    const gameID = playerController.getPlayerGameID(socket.id);
    console.log(gameID);
    const activeGame = activeGames[gameID];
    let enemySocket;
    // Find the socketID of other player in the game.  This socketID is then used to
    // send the move to the other player.
    if(socket.id === activeGame.player1.socket.id){
        enemySocket = activeGame.player2.socket;
    }
    else{
        enemySocket = activeGame.player1.socket;
    }

    const currentPlayerUserName = playerController.getUserNameBySocketID( socket.id );
    // The variable isWon keeps track of if a player has won yet.  If this turns true then
    // the socket sending the new move is the winner.
    let isWon = activeGame.game.makeMove(move.row, move.column, currentPlayerUserName);
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
    // a winning condition was fulfilled then we update db accordingly
    if (isWon.length > 1 && isWon[0]) {
      db.updateMatchWinner(currentPlayerUserName, isWon[1], activeGame.dbId)
      .then((result) => {
        console.log("DB has been updated with name of winner: "+ currentPlayerUserName);
      });
      // Let the players know who won,  the players will then clear the board and start a new game
      // when they recieve these messages.
      // (socket.emit broadcasts to the user that played the last move)
      // (socket.broadcast.emit) broadcasts to the losing player.
      io.to('game'+gameID).emit('newGame');
      io.to('game'+gameID).emit('announcement', connectedPlayers[socket.id].userName + ' just won!');
      io.to('game'+gameID).emit('announcement', currentPlayerUserName + ' just won!');
      socket.emit('youWon');
      enemySocket.emit('yourTurn');
    }

    if(!isWon[0] && !draw){
      // No one won so the game continues.
      enemySocket.emit('enemyTurn', move.column);
      enemySocket.emit('yourTurn');
    }
  });

  socket.on('challenge', challenged => {
    const challenger = playerController.getUserNameBySocketID( socket.id );
    console.log(challenged);
    const challengedSocket = playerController.getSocketByUserName( challenged );
    socket.emit('announcement', 'You have challanged '+challenged+' to a match!');
    challengedSocket.emit('challenged', challenger);

  });

  socket.on('acceptChallenge', challenger => {
    const player1 = {'userName': playerController.getUserNameBySocketID( socket.id ),
                     'socket': socket};
    const player2 = {'userName': challenger,
                     'socket': playerController.getSocketByUserName( challenger )};
    const player1Socket = player1.socket;
    const player2Socket = player2.socket;

    // Tell the playerController that these players will join a game.
    playerController.playerJoinGame(player1.userName, gameID);
    playerController.playerJoinGame(player2.userName, gameID);
    // Make the player sockets join a room so they can talk in private.
    player1Socket.join('game'+gameID);
    player2Socket.join('game'+gameID);

    const activeGame = {'game': new game.Game(player1.userName, player2.userName),
                        'player1': player1,
                        'player2': player2,
                        'dbId': null};

    db.createMatch(player1.userName, player2.userName, null, activeGame.game.gameBoard) // (player1, player2, winner, grid)
    .then((result) => {
      activeGame.dbId = result[0].id; // get the db ID of the match
    });

    activeGames[gameID] = activeGame;

    io.to('game'+gameID).emit('newGame');
    io.to('game'+gameID).emit('announcement', 'In this game '+player1.userName+
                              ' and ' + player2.userName + ' will compete!');
    io.to('game'+gameID).emit('announcement', player1.userName+' starts!');
    player1.socket.emit('yourTurn');
    // Increment the gameID so the next game will have a different gameID
    gameID++;


  });

  // Someone send a new message
  socket.on('userMsg', (msg) => {
    // Find the game id of the game the socket is in.  We then Broadcast
    // to that socket.io room.
    const gameID = playerController.getPlayerGameID( socket.id );
    const userName = playerController.getUserNameBySocketID( socket.id );
    console.log(gameID);
    if(gameID > -1){
    // Broadcast the message to the other players.
      io.to('game'+gameID).emit('newMsg', userName +': '+msg);
    }
    else{
      socket.emit('announcement', 'Join a game to talk to other players!');
    }
  })

  // Do something when a client disconnects
  socket.on('disconnect', () => {
    console.log('A user disconnected');
    playerController.setPlayerOffline(socket.id);
    // Because a user disconnected we have to update the online players list.
    io.emit('updatePlayerList', playerController.getOnlinePlayers());
  })
})

module.exports = app;
