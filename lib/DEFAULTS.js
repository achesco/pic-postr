var _ = require('lodash'),
    serviceDefaults = {
        interval: 60,
        order: 'abc',
        extractIptc: false
    };

module.exports = {
    logLevel: 'warn',
    tumblr: serviceDefaults,
    flickr: serviceDefaults
};