const pgp = require('pg-promise')();

const env = process.env.DATABASE_URL;
const db = pgp(env || 'postgres://postgres:dadi@localhost:5432/C4');

// Create the tables!
function createTables() {
  // Users table created. Apparently "user" is a keyword in pg (which took me
  // about an hour to figure out..) so the table cannot be named that, even though
  // that would have been the most straightforward name.
  // This table should probably have a "matches" array attribute so we can look up
  // the matchIDs of each player in order to keep track of score between two
  // players, f.ex.. Or maybe it's enough to have the 'match' table to cover who's
  // involved in which match?
  db.none(`CREATE TABLE IF NOT EXISTS player(
            id             SERIAL PRIMARY KEY,
            username       varchar(32),
            password       varchar(64),
            email          varchar(40),
            signupdate     varchar(19)
  )`)
  .then(() => {
  })
  .catch((error) => {
    console.log(error);
  });

  // Match table created. If two players are going head to head we can look up
  // if they have any previous matches and then lookup the results in the
  // matchResult table. I figure that we can somehow record the moves already made
  // in the grid, so we can load up an ongoing game between 2 users, if the come
  // back to it after some time.
  db.none(`CREATE TABLE IF NOT EXISTS match(
            id               SERIAL PRIMARY KEY,
            player1          varchar(32),
            player2          varchar(32),
            winner           varchar(32),
            grid             varchar(8)[][]
  )`)
  .then(() => {
  })
  .catch((error) => {
  });

// Table containing the outcome of individual matches
  db.none(`CREATE TABLE IF NOT EXISTS matchResult(
            id               SERIAL PRIMARY KEY,
            matchId          int,
            winner           varchar(32)
  )`)
  .then(() => {
  })
  .catch((error) => {
  });
}

// Inserts a new user.
// returns a promise
function insertUser(user, pass, e, date) {
  return db.none(`INSERT INTO player(username, password, email, signupdate) VALUES($1, $2, $3, $4)`,
  [user, pass, e, date]);
}

// Finds a single user by username
// returns a promise
function findOne(name) {
  return db.any(`SELECT * FROM player WHERE username = $1`, [name]);
}

function getUserId(name) {
  return db.any(`SELECT id FROM player WHERE username = $1`, [name]);
}

function createMatch(username1, username2, winnerPerson, gameGrid) {
  return db.any(`INSERT INTO match(player1, player2, winner, grid) VALUES($1, $2, $3, $4) RETURNING id` ,
  [username1, username2, winnerPerson, gameGrid]);
}

function updateMatchPlayer1(username, matchid) {
  return db.any(`UPDATE match SET player1 = $1 WHERE id = $2`, [username, matchid]);
}

function updateMatchPlayer2(username, matchid) {
  return db.none(`UPDATE match SET player2 = $1 WHERE id = $2`, [username, matchid]);
}

function updateMatchWinner(username, board, matchid) {
  return db.none(`UPDATE match SET winner = $1, grid = $2 WHERE id = $3`, [username, board, matchid]);
}

function updateMatchBoard(board, matchid) {
  return db.none(`UPDATE match SET grid = $1 WHERE id = $2`, [board, matchid]);
}

module.exports = {
  createTables,
  findOne,
  insertUser,
  getUserId,
  createMatch,
  updateMatchPlayer1,
  updateMatchPlayer2,
  updateMatchWinner,
  updateMatchBoard
};
