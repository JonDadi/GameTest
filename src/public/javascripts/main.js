const Main = (() => {

  function init() {
    const socket = io();
    const btnSubmit = document.getElementById('btnSubmit');
    const btnUserName = document.getElementById('btnUserName');
    const userInput = document.getElementById('msg');
    const msgBox = document.getElementById('msgBox');
    const wordToDraw = document.getElementById('word');
    const userNameBox = document.getElementById('userName');
    const canvasBoard = document.getElementById('drawBoard');
    const drawBoard = canvasBoard.getContext('2d');

    let userName = '';
    let info = {};
    let currX = 25;
    let currY = 25;
    let lastX = 50;
    let lastY = 50;
    let drawing = false;
    let yourTurn = false;


    let line = {};
    let lineArray = [];



    function drawLine(lastX, lastY, currX, currY) {
      drawBoard.beginPath();
      drawBoard.moveTo(lastX, lastY);
      drawBoard.lineTo(currX, currY);
      drawBoard.stroke();
      drawBoard.closePath();

    }

    canvasBoard.addEventListener("mousemove", function (e) {
        // Draw to the canvas if its the players turn and the mouse button is
        // pushed down.
        if(yourTurn && drawing){
          lastX = currX;
          lastY = currY;
          currX = e.clientX - canvasBoard.offsetLeft;
          currY = e.clientY - canvasBoard.offsetTop;

          let line = {};
          line.currX = currX;
          line.currY = currY;
          line.lastX = lastX;
          line.lastY = lastY;
          lineArray.push(line);

          drawLine(lastX, lastY, currX, currY);
        }
    }, false);

    canvasBoard.addEventListener("mousedown", e => {
      currX = e.clientX - canvasBoard.offsetLeft;
      currY = e.clientY - canvasBoard.offsetTop;
      drawing = true;
    })

    canvasBoard.addEventListener("mouseup", e => {
      drawing = false;
      socket.emit('lines', lineArray);
    })

    // changing of username
    btnUserName.addEventListener('click', e => {
      info.userName = userNameBox.value;
      socket.emit('getInfo', info);
      console.log(info.userName);
    });

    socket.on('yourTurn', word => {
      wordToDraw.innerHTML = 'Your turn!! you are drawing a '+word;
      yourTurn = true;
    })

    socket.on('newGame', () => {
      yourTurn = false;
      wordToDraw.innerHTML = '';
      drawBoard.clearRect(0, 0, canvasBoard.width, canvasBoard.height);
    })

    function drawLineArray(lines){
      for(let i = 0; i < lines.length; i++){
        const line = lines[i];
        drawLine(line.lastX, line.lastY, line.currX, line.currY);
      }
    }

    socket.on('drawLine', lines => {
      drawLineArray(lines);
    })
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
