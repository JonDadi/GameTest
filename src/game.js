function Game(player1, player2){
  this.player1 = player1;
  this.player2 = player2;
  this.setUpBoard();
}

Game.prototype.setUpBoard = function(){
  this.gameBoard = [];
  // Keeps track of how many moves have been made.
  this.numMoves = 0;
  for(let i = 0; i < 7; i++){
    this.gameBoard[i] = []
    for(let j = 0; j < 7; j++){
      this.gameBoard[i][j] = 0;
    }
  }
  console.log('board made');
}

Game.prototype.checkIfVictory = function(){
  // Assign the board to b so the variable name is as short as possible
  // this makes it easier to make longer if conditions.
  const b = this.gameBoard;
  // Don't check if there is a win untill atleast 6 moves have been made.
  if(this.numMoves > 6){
    // Check if there are 4 in a row in any column or row.
    for(let i = 0; i < 7; i++) {
      for(let j = 0; j < 3; j++) {
        // Check if there are 5 back to back coins in a row
        if(b[i][j] === b[i][j+1] && b[i][j+1] === b[i][j+2] && b[i][j+2] === b[i][j+3] && b[i][j] !== 0) {
            return true;

        }
        if(b[j][i] === b[j+1][i] && b[j+1][i] === b[j+2][i] && b[j+2][i] === b[j+3][i] && b[j][i] !== 0) {
            return true;
        }
      }
    }
    // Check if there is / or \ 4 in a row.
    for(let i = 0; i < 4; i++) {
      for(let j = 0; j < 4; j++) {
        if(b[i][j] === b[i+1][j+1] && b[i+1][j+1] === b[i+2][j+2] && b[i+2][j+2] === b[i+3][j+3] && b[i][j] !== 0) {
            return true;
        } // if
      } // inner for
    }// Outer for

    for(let i = 6; i >= 3; i--) {
      for(let j = 0; j < 4; j++) {
        if(b[j][i] === b[j+1][i-1] && b[j+1][i-1] === b[j+2][i-2] && b[j+2][i-2] === b[j+3][i-3] && b[j][i] !== 0) {
          return true;
        } // if
      } // inner for
    }// Outer for
  }// if numMoves > 6
  return false;
}

Game.prototype.makeMove = function(row, column, player) {
  let playerId;
  if(this.player1 === player){
    playerId = 1;
  }
  else{
    playerId = 2;
  }


  if(playerId === 1){
    this.gameBoard[row][column] = playerId;
  }
  else {
    this.gameBoard[row][column] = playerId;
  }
  this.numMoves++;
  // Return -1 if there is a draw
  if(this.numMoves === this.gameBoard[0].length * this.gameBoard[0].length) return -1;

  //console.log(this.gameBoard);
  const isWon = this.checkIfVictory();
  if(isWon){
    this.setUpBoard();
  }
  return isWon;
}

module.exports = { Game };
