var log = require('basic-log');

module.exports = function (message) {
    var phs  = Array.prototype.slice.call(arguments, 1),
        i = 0;

    message = message.replace(/%s/g, function () {
        return phs[i++];
    });
    return log.call(log, message);
};
