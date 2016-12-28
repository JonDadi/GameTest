function Game(){
  this.setUpBoard();
}

Game.prototype.setUpBoard = function(){
  this.gameBoard = [];
  for(let i = 0; i < 7; i++){
    this.gameBoard[i] = []
    for(let j = 0; j < 7; j++){
      this.gameBoard[i][j] = 0;
    }
  }
}

Game.prototype.checkIfVictory = function(){
  // Assign the board to b so the variable name is as short as possible
  // this makes it easier to make longer if conditions.
  const b = this.gameBoard;
  console.log('Current game status:')
  console.log(b);
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

  return false;
}

Game.prototype.makeMove = function(row, column, player) {

  if(player === 1){
    this.gameBoard[row][column] = 1;
  }
  else {
    this.gameBoard[row][column] = 2;
  }
  //console.log(this.gameBoard);
  const isWon = this.checkIfVictory();
  if(isWon){
    this.setUpBoard();
  }
  return isWon;
}

module.exports = { Game };
