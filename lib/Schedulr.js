var vow = require('vow'),
    fs = require('fs'),
    vfs = require('vow-fs'),
    path = require('path'),
    _ = require('lodash'),
    EventEmitter = require('events').EventEmitter,
    Sortr = require('./Sortr');

/**
 * @event Schedulr#posted
 * @type {Object}
 * @prop {String} fileName
 * @prop {String} postId
 */

/**
 * Folder scaner, job list maker and runner.
 * @param {Postr} postr
 * @constructor
 */
var Schedulr = function (postr) {
    var config = postr.getConfig(),
        folderPath = postr.getFolderPath(),
        doneFolderPath = folderPath + path.sep + 'done',
        failedFolderPath = folderPath + path.sep + 'failed',
        api = Object.create(EventEmitter.prototype),
        sortr = new Sortr(config.order);

    /**
     * Get postr instance
     * @returns {Postr}
     */
    api.getPostr = function () {
        return postr;
    };

    /**
     * Get files list
     * @returns {vow.Promise.<String[]>}
     */
    api.collectFiles = function () {
        return vfs.listDir(folderPath).then(function (list) {
            return vow.allResolved(list.reduce(function (promises, fileName) {
                promises[fileName] = vfs.stat(folderPath + path.sep + fileName);
                return promises;
            }, {})).then(function (statsInfo) {
                return Object.keys(_.pick(statsInfo, function (promise) {
                    return promise.isResolved() && promise.valueOf().isFile();
                }));
            });
        });
    };

    /**
     * Create service folders 'done' and 'failed'
     * @returns {vow.Promise}
     */
    api.ensureServiceFolders = function () {
        return vow.all([
            vfs.makeDir(doneFolderPath),
            vfs.makeDir(failedFolderPath)
        ]);
    };

    /**
     * Just run it already
     * @returns {vow.Promise}
     */
    api.run = function () {
        api.ensureServiceFolders()
            .then(function () {
                return api.collectFiles();
            })
            .then(function (list) {
                return runWithList(list);
            });
    };

    /**
     * Run schedulr for given list, list could be modified on the fly
     * @param {String[]} list
     * @returns {vow.Promise}
     */
    function runWithList(list) {
        var watcher, uploader;

        sortr.setList(list);

        watcher = require('chokidar').watch(folderPath, {
            ignored: function (filePath) {
                if (filePath === folderPath) {
                    return false;
                }
                return filePath.indexOf(doneFolderPath + path.sep) === 0 ||
                    filePath.indexOf(failedFolderPath + path.sep) === 0;
            },
            ignoreInitial: true,
            followSymlinks: false,
            depth: 1
        });

        watcher.on('add', function (filePath) {
            list.push(filePath.substr(folderPath.length + 1));
            sortr.update();
        });

        uploader = function (fileName) {
            if (fileName) {
                postr.post(fileName).always(function (promise) {
                    var value = promise.valueOf(),
                        targetFolder = promise.isFulfilled() ? doneFolderPath : failedFolderPath;

                    if (promise.isFulfilled()) {
                        api.emit('posted', {
                            fileName: fileName,
                            postId: value
                        });
                    } else {
                        api.emit('failed', {
                            fileName: fileName,
                            error: value
                        });
                    }
                    fs.rename(folderPath + path.sep + fileName, targetFolder + path.sep + fileName);
                }).done();
            }
            setTimeout(uploader.bind(api, sortr.next()), config.interval * 1000);
        };

        uploader(sortr.next());

        return vow.fulfill();
    };

    return api;
};

module.exports = Schedulr;
