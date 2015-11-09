/**
 * @param {Number|String} message Error code or message
 * @param {Error} [error] Original error instance
 * @constructor
 */
var Err = function (message, error) {
    this.message = message;
    this.stack = error ? message + '\n\r' + error.stack : new Error(this.toString()).stack;
};
Err.prototype = Object.create(Error.prototype);
Err.prototype.constructor = Err;

module.exports = Err;
