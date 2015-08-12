var _ = require('lodash'),
    Err;

/**
 * @param {Number|String} message Error code or message
 * @param {Error} [error] Original error instance
 * @constructor
 */
Err = function (message, error) {
    this.message = message;
    this.stack = error ? message + '\n\r' + error.stack : new Error(this.toString()).stack;
};
Err.prototype = Object.create(Error.prototype);
Err.prototype.constructor = Err;

/**
 * Get full error message for error or errors list
 * @param {Error[]} errors
 * @returns {String}
 * @static
 */
Err.getFullMessage = function (errors, expand) {
    var lines = [Err.errors.FULL_MESSAGE_BANNER];
    errors = _.flatten([errors]);
    errors.forEach(function (error) {
        if (error instanceof Error) {
            lines.push(error.stack);
        } else {
            lines.push(String(error));
        }
    });
    return lines.join('\n\r');
};

Err.errors = {
    'FULL_MESSAGE_BANNER': 'Application errors\n\r------------------'
};

module.exports = Err;
