var vow = require('vow'),
    vfs = require('vow-fs'),
    _ = require('lodash'),
    path = require('path'),
    Err = require('./Err'),
    Configr;

/**
 * Configutator class to process app config file.
 * @param {String} basePath working dir path
 * @param {Object} config
 * @returns {Object} API
 * @constructor
 */
var Configr = function (basePath, config) {
    var folders = Object.keys(config.folders || {}),
        api = {},
        foldersConfigs;

    basePath = _.trimRight(basePath, path.sep);

    foldersConfigs = folders.reduce(function (foldersConfigs, key) {
        var itemConfig = config.folders[key],
            generalConfig = config[itemConfig.service];

        foldersConfigs[key] = _.merge({}, generalConfig, itemConfig);
        return foldersConfigs;
    }, {});

    /**
     * Get folder path
     * @param {String} folderName
     * @returns {String}
     */
    api.getFolderPath = function (folderName) {
        return basePath + path.sep + folderName;
    };

    /**
     * Get configured folders names list
     * @returns {String[]}
     */
    api.getFolders = function () {
        return folders.slice(0);
    };

    /**
     * Get cofig for folder
     * @param {String} folderName
     * @returns {Object}
     */
    api.getFolderConfig = function (folderName) {
        return _.merge({}, foldersConfigs[folderName]);
    };

    /**
     * Validate folders from configuration
     * @returns {Object<String, Boolean>}
     */
    api.checkFolders = function () {
        var promises = folders.reduce(function (promises, folderName) {
            promises[folderName] = vfs.stat([basePath, folderName].join(path.sep));
            return promises;
        }, {});

        return vow.allResolved(promises).then(function (promises) {
            return folders.reduce(function (results, folderName) {
                var promise = promises[folderName];

                if (promise.isFulfilled()) {
                    if (promise.valueOf().isDirectory()) {
                        results[folderName] = 'ok';
                    } else {
                        results[folderName] = new Err(folderName + ' is not a folder');
                    }
                } else if (promise.isRejected()) {
                    results[folderName] = new Err(folderName + ' not found');
                }
                return results;
            }, {});
        });
    };

    return api;
};

module.exports = Configr;
