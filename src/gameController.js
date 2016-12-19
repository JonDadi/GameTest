const GameController = (() => {
  const io;
  const connectedPlayers = [];



  function init(server) {
    io = require('socket.io').listen(server);
    startGameServer();
  }

  function startGameServer() {
    io.on('connection', socket => {
      console.log('user connected!');
      connectedPlayers[socket.id].socket = socket;
      //Check userInfo
      socket.on('sendInfo', userName => {
        connectedPlayers[socket.id].userName = userName;
      })

      socket.on('userMsg', msg => {
        io.emit('newMsg', connectedPlayers[socket.id].userName +': '+msg);
      })

    })
  }











  return {
    init,
  };
})();
