/* SERVER VARIABLES */
const express = require('express');
const path = require('path');
const app = express();
const http = require('http');
const server = http.createServer(app);
const routes = require('./routes');
const io = require('socket.io').listen(server);


/* GAME VARIABLES */
const connectedPlayers = [];
const wordToGuess = 'penus';
let numPlayers = 0;
let activePlayer = '0'

app.set('port', 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));

server.listen(3000);
//app.use('/', routes);

app.get('/', (req, res, next) => {
  res.render('index');
});

// When a client connects to our server.
io.on('connection', socket => {
  console.log('user connected!');
  connectedPlayers[socket.id] = {};
  // We can now use the socket in this array to send to this client.
  connectedPlayers[socket.id].socket = socket;
  // Assign a temp username if the player does not provide one.
  connectedPlayers[socket.id].userName = 'Anon'+numPlayers;
  //Ask the client to send us info
  socket.emit('sendInfo');
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
