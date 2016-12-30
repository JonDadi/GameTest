const Main = (() => {



  function init() {

    // ###### GAME VARIABLES ########

    // Array the has 7 elements,  one for each column on the board.
    // Each array element is the number of coins currently in that column.
    let coinsInColumn = [];
    // Variable used to keep track of if it's your turn or not.
    let yourTurn = false;
    const textStyle = {fontSize: '36px',
                       fill : '#000000'};
    const waitingText = new PIXI.Text('Waiting for an opponent!', textStyle)

    const socket = io();
    const btnSubmit = document.getElementById('btnSubmit');
    const userInput = document.getElementById('msg');
    const msgBox = document.getElementById('msgBox');
    const wordToDraw = document.getElementById('word');
    const canvasWrapper = document.getElementById('canvasWrapper');
    const boardHeight = 700;
    const boardWidth = 700;
    // The PIXI renderer.
    let renderer = PIXI.autoDetectRenderer(boardHeight, boardWidth);
    renderer.backgroundColor = 0x696969;
    // Append the canvas element to the canvas wrapper.  The pixie library creates
    // the canvas element for us.  The canvas element will from here on be
    // referred to as renderer.view
    canvasWrapper.appendChild(renderer.view);

    // Initialize the stage where everything will be drawed on.
    let stage = new PIXI.Container();

    // ########### SOCKET FUNCTIONS ##############
    socket.on('newGame', () => {
      newGame();
      drawGrid();
    });

    socket.on('enemyTurn', column => {
      const enemyCoin = createCircle(column, true)
      stage.addChild(enemyCoin);
      coinsInColumn[column]++;
      renderer.render(stage);
      });

    socket.on('youWon', ()  => {
        yourTurn = false;
    });

    socket.on('youLost', () => {
        yourTurn = true;
    })

    socket.on('yourTurn', () => {
        yourTurn = true;
    })

    socket.on('waiting', () => {
      waitingText.x = 150;
      waitingText.y = 350;
      stage.addChild(waitingText);
      renderer.render(stage);
    })

    // ######### EVENT FUNCTIONS ############
    renderer.view.addEventListener("mousedown", e => {
      if(yourTurn){
        const xPos = e.clientX - renderer.view.offsetLeft;
        // Decide which of the seven columns the user clicked on.
        const column = getColumn(xPos);
        // Only create a coin when there are less than 7 in that column
        if(coinsInColumn[column] < 7){
          // Construct a move objects that tells us what row and column
          // the coin should be places in.
          const move = {'row' : coinsInColumn[column],
                        'column' : column };
          // Send the move to the server.
          socket.emit('sendTurn', move);
          // Create and add a friendly (yellow) coin to the board.
          const friendlyCoin = createCircle(column, false);
          stage.addChild(friendlyCoin);
          // Increment the coin counter for that column.
          coinsInColumn[column]++;
          // The player has finished his turn.
          yourTurn = false;
          // Draw the stage again because we added a coin.
          renderer.render(stage);
        }
        else{
          console.log('Max number of coins in column reached!');
        }
      }
    });


    // ######### GAME FUNCTIONS #########
    // Draws the blue grid on the board.
    function drawGrid(){
      const lineWidth = Math.round(boardWidth / 35);
        for( let i = 0; i<8; i++){
          line = new PIXI.Graphics();
          line.lineStyle(lineWidth, 0x0000FF);
          line.moveTo(i*100, 0);
          line.lineTo(i*100, boardWidth);
          stage.addChild(line);
        }
        for(let j = 0; j<8; j++){
          line = new PIXI.Graphics();
          line.lineStyle(lineWidth, 0x0000FF);
          line.moveTo(0, j*100);
          line.lineTo(boardHeight, j*100);
          stage.addChild(line);
        }
        renderer.render(stage);
    }



    // xPos is the position of the mouse click.
    // returns the column that the mouse clicked on.
    function getColumn(xPos){
      column = Math.round((xPos-50) / 100);
      return column;
    }

    // Initialize a new game by clearing the coin column counter and
    // remove all previous coins from the board.
    function newGame(){
      for(let i = 0; i<7; i++) {
        coinsInColumn[i] = 0;
      }
      for(let i = stage.children.length -1; i>=0; i--){
        stage.removeChild(stage.children[i]);
      }
      renderer.render(stage);
    }

    // x is the column which the coin should be placed in.
    // enemy is a boolean variable that is true if the coin belongs to the
    // enemy player,  it is then colored red instead of yellow if the variable is false.
    // Returns a PIXI.Graphics objects that is a circle.
    function createCircle(x, enemy){
      let circleColor = 0xFFFF00;
      if(enemy) circleColor = 0xFF0000;

      const circle = new PIXI.Graphics();
      circle.beginFill(circleColor);
      circle.drawCircle(0,0,32);
      circle.endFill();
      circle.x = (x*100)+50;
      circle.y = 650-(coinsInColumn[x]*100);
      return circle;
    }

    // ######### CHAT FUNCTIONS ############
    socket.on('announcement', msg => {
      writeInChat(msg, true);
    })
    socket.on('newMsg', msg => {
      writeInChat(msg, false);
    });

    function  writeInChat(message, isImportant){
      const chatItem = document.createElement('li');
      const chatText = document.createTextNode(message);
      if(isImportant){
        chatItem.className = 'announcement';
      }
      chatItem.appendChild(chatText);
      msgBox.appendChild(chatItem);
    }

    btnSubmit.addEventListener('click', () => {
      socket.emit('userMsg', userInput.value);
      userInput.value = '';
    });
  }
  return {
    init,
  };
})();

document.addEventListener('DOMContentLoaded', (event) => {
  Main.init();
});
