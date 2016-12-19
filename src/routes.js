/* routes hér */

const express = require('express');

const router = express.Router();

/* Get index site */
router.get('/', (req, res, next) => {
  res.render('index');
});


module.exports = router;
