const {
  Uploader
} = require('./types');

module.exports = function (prefix, accounts) {
  return new Uploader({
    prefix,
    accounts
  });
}