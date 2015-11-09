var logger = require('basic-log'),
    LEVELS = ['error', 'warn', 'info', 'debug'],
    DEFAULT_LEVEL = 'warn',
    api, log;

/**
 * Log message, %s placeholders will be replaced with passed values
 * @param {String} method
 * @param {String} message
 * @param {... String} [placeholers]
 */
log = function (method, message) {
    var phs = [].slice.call(arguments, 2),
        i = 0;
    if (phs.length) {
        message = message.replace(/%s/g, function () {
            return phs[i++];
        });
    }
    return this[method](message);
};

api = LEVELS.reduce(function (api, level) {
    api[level] = function () {
        var args = [].slice.call(arguments, 0);
        args.unshift(level.substr(0, 1));
        log.apply(logger, args);
    };
    return api;
}, {});

/**
 * Set log level, log levels are: none, error, warn, info, debug
 * @param {Number} level
 */
api.setLevel = function (level) {
    level = LEVELS.indexOf(level) !== -1 ? level : DEFAULT_LEVEL;
    logger.setLevel(level, true);
};

module.exports = api;
