const pgp = require('pg-promise')();

const env = process.env.DATABASE_URL;
const db = pgp(env || 'postgres://postgres:gusti@localhost:5432/C4');

// Create the tables!
function createTables() {
  // Users table created. Apparently "user" is a keyword in pg (which took me
  // about an hour to figure out..) so the table cannot be named that, even though
  // that would have been the most straightforward name.
  // This table should probably have a "matches" array attribute so we can look up
  // the matchIDs of each player in order to keep track of score between two
  // players, f.ex..
  db.none(`CREATE TABLE IF NOT EXISTS player(
            id             SERIAL PRIMARY KEY,
            username       varchar(32),
            password       varchar(64)
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
function insertUser(user, pass) {
  return db.none(`INSERT INTO player(username, password) VALUES($1, $2)`, [user, pass]);
}

// Finds a single user by username
// returns a promise
function findOne(name) {
  return db.any(`SELECT * FROM player WHERE username = $1`, [name]);
}

module.exports = {
  createTables,
  findOne,
  insertUser
};
