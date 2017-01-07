
const connectedPlayers = [];
const playersInQueue = [];



// Finds the userName that belongs to a socket that is currently online.
// If there is no user with that socket that is online then return null;
function getUserNameBySocketID( socketID ){
  for( user in connectedPlayers ) {
    if(connectedPlayers[user].socket.socketId === socketID &&
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
    // Clear the old data and put some new awesome data into the array.
    connectedPlayers[userName] = {};
    connectedPlayers[userName].socket = socket;
    connectedPlayers[userName].isOnline = true;
}

// TO DO:
// Set a player to offline if he disconnects from the site.
function setPlayerOffline( userName ) {
  connectedPlayers[userName].isOnline = false;
}
// Sets a player into the queue,  by beying in the queue he is
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


// Get all currently online players
// returns an array of usernames
function getOnlinePlayers() {
  const onlinePlayers = [];
  for( userName in connectedPlayers ) {
    if(connectedPlayers[userName].isOnline){
      onlinePlayers.push(userName);
    }
  }
  return onlinePlayers;
}

module.exports = {
  setPlayerOnline,
  setPlayerOffline,
