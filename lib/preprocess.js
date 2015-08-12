var vow = require('vow'),
    im = require('imagemagick'),
    _ = require('lodash');

/**
 * Extract specific metadata
 * @param {String} filePath
 * @param {String} meta
 * @returns {vow.Promise.<String>}
 */
function extract(filePath, meta) {
    var deferred = vow.defer(),
        promise = deferred.promise();

    try {
        im.identify(['-format', meta, filePath], function (err, data) {
            deferred.resolve(data);
        });
    } catch (err) {
        deferred.resolve([]);
    }
    return promise;
}

module.exports = {

    /**
     * Extract keywords
     * @param {String} filePath
     * @returns {vow.Promise.<String>}
     */
    tags: function (filePath) {
        return extract(filePath, '%[IPTC:2:25]').then(function (tagsStr) {
            if (tagsStr) {
                tagsStr = tagsStr.split(';').join(',');
            }
            return tagsStr;
        });
    },

    /**
     * Extract caption
     * @param {String} filePath
     * @returns {vow.Promise.<String>}
     */
    caption: function (filePath) {
        return extract(filePath, '%[IPTC:2:120]');
    }
};