
const connectedPlayers = [];
const playersInQueue = [];



// Finds the userName that belongs to a socket that is currently online.
// If there is no user with that socket that is online then return null;
function getUserNameBySocketID( socketID ){
  for( user in connectedPlayers ) {
    if(connectedPlayers[user].socket.id === socketID &&
       connectedPlayers[user].isOnline) {
      return user;
    }
  }
  return null;
}


// Finds the socket that belongs to a specific user
// returns null if it can't find the user or if he is not online.
function getSocketByUserName( userName ) {
  if (connectedPlayers[userName].isOnline){
    return connectedPlayers[userName].socket;
  }
  return null;
}


// Check if a player is in the connectedPlayers array.
function checkIfPlayerExists( userName ){
  for( user in connectedPlayers ) {
    if( user === userName ){
      return true;
    }
  }
  return false;
}

// Inserts the player into the connectedPlayers array.
function setPlayerOnline( userName, socket){
    // Check if the player has been initialized before,  if not then
    // initialize the player.
    if(!connectedPlayers[userName]){
      connectedPlayers[userName] = {};
    }
    connectedPlayers[userName].socket = socket;
    connectedPlayers[userName].isOnline = true;

    console.log(getUserNameBySocketID(socket.id));
}

// TODO: Set a player to offline if he disconnects from the site.
function setPlayerOffline( socketID ) {
  const userName = getUserNameBySocketID(socketID);
  console.log("user:"+userName);
  connectedPlayers[userName].isOnline = false;
}
// Sets a player into the queue, by being in the queue he is
// waiting for a game.
function setPlayerIntoQueue( userName ) {
  playersInQueue.push(userName);
}
// Removes a player from the queue and returns his socket and userName
function getPlayerFromQueue(){
  const userName = playersInQueue.pop();
  const socket = getSocketByUserName( userName );
  return {'userName': userName,
          'socket': socket};
}

function getNumPlayersInQueue(){
  return playersInQueue.length;
}

// set the gameID that the player is playing in.
function playerJoinGame( userName, gameID ){
  connectedPlayers[userName].inGame = gameID;
}

// Delete the current gameID.
function playerLeaveGame( userName ) {
  connectedPlayers[userName].inGame = null;
}

function getPlayerGameID( socketID ) {
  const userName = getUserNameBySocketID( socketID );
  return connectedPlayers[userName].inGame;
}


// Get all currently online players
// returns an array of usernames
function getOnlinePlayers() {
  const onlinePlayers = [];
  for( userName in connectedPlayers ) {
    if(connectedPlayers[userName].isOnline && !connectedPlayers[userName].inGame){
      onlinePlayers.push(userName);
    }
  }
  return onlinePlayers;
}

module.exports = {
  setPlayerOnline,
  setPlayerOffline,
  setPlayerIntoQueue,
  getOnlinePlayers,
  getPlayerFromQueue,
  getUserNameBySocketID,
  getPlayerGameID,
  playerJoinGame,
  playerLeaveGame,
  getNumPlayersInQueue,
}
