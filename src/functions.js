const db = require('./dbConnect');

const bcrypt = require('bcryptjs');
const Q = require('q');

//used in local-signup strategy
exports.localReg = function (username, password, email) {
  var deferred = Q.defer();

  // returns an object if a user is found. Trying to access index 0 will tell us
  // whether a username was found or not
  db.findOne(username)
  .then((result) => {
    if (result[0]) {
      console.log("USERNAME ALREADY EXISTS:", result[0].username);
      deferred.resolve(false); // username exists
    } else  {
      password = bcrypt.hashSync(password, 8);

      console.log("CREATING USER: " + username);

      let user = { "username": username, "password": password, "email": email};
      const now = getDateTime();

      db.insertUser(username, password, email, now)
      .then(() => {
        deferred.resolve(user);
      });
    } // end 'else' clause
  });
  return deferred.promise;
};


// check if user exists
// if user exists check if passwords match (use bcrypt.compareSync(password, hash); true where 'hash' is password in DB)
// if password matches take into website
// if user doesn't exist or password doesn't match tell them it failed
exports.localAuth = (username, password) => {
  var deferred = Q.defer();

  db.findOne(username)
    .then((result) => {
      if (!result[0]) {
        console.log("USERNAME NOT FOUND:", username);
        deferred.resolve(false);
      } else {
        const hash = result[0].password;

        console.log("FOUND USER: " + result[0].username);

        if (bcrypt.compareSync(password, hash)) {
          deferred.resolve(result[0]);
        } else {
          console.log("AUTHENTICATION FAILED");
          deferred.resolve(false);
        }
      }
    });

  return deferred.promise;
}

function getDateTime() {
  const currentdate = new Date();

  let day = currentdate.getDate();
  let month = currentdate.getMonth()+1;
  let year = currentdate.getFullYear();
  let hours = currentdate.getHours();
  let minutes = currentdate.getMinutes();
  let seconds = currentdate.getSeconds();

  // Add zero to segment if it is only 1 character, f.ex. 1 second should be 01 second.
  // Having 'year' in the array is redundant, but I'm keeping it there for clarity's sake.
  let arr = [day, month, year, hours, minutes, seconds];
  for (var i = 0; i < arr.length; i++) {
    if(arr[i].toString().length === 1) {
      arr[i] = '0' + arr[i];
    }
  }

  const datetime = arr[0] + "-"
                + arr[1] + "-"
                + arr[2] + " "
                + arr[3] + ":"
                + arr[4] + ":"
                + arr[5];
  return datetime;
}
