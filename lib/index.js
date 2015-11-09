var vow = require('vow'),
    vfs = require('vow-fs'),
    fs = require('fs'),
    _ = require('lodash'),
    Err = require('./Err'),
    Configr = require('./Configr'),
    cluster = require('cluster'),
    logr = require('./logr'),
    deferred = vow.defer(),
    promise = deferred.promise();

/**
 * Log errors
 * @param {Error|Error[]} errors
 * @returns {String}
 * @static
 */
function onFail(errors) {
    errors = _.flatten([errors]);
    errors.forEach(function (error) {
        if (error instanceof Error) {
            logr.error(error.message);
            logr.debug(error.stack);
        } else {
            logr.error(String(error));
        }
    });
};

module.exports = {

    /**
     * Init and run with options
     * @param {String} basePath Working dir path
     * @param {Object} appConfig Config options
     */
    init: function (basePath, appConfig) {
        basePath = fs.realpathSync(basePath);
        logr.setLevel(appConfig && appConfig.logLevel);

        if (cluster.isMaster) {

            vfs.stat(basePath)
                .always(function (promise) {
                    if (promise.isRejected()) {
                        return vow.reject(
                            new Err('Can\'t stat folder by given path (' + basePath + ')', promise.valueOf())
                        );
                    }
                    if (!promise.valueOf().isDirectory()) {
                        return vow.reject(new Err('Not a directory (' + basePath + ')'));
                    }
                }).then(function () {
                    var configr = new Configr(basePath, appConfig);

                    return configr.checkFolders().then(function (results) {
                        var folders = Object.keys(results),
                            errors;

                        errors = folders.reduce(function (errors, folderName) {
                            var error = results[folderName];

                            if (error instanceof Err) {
                                errors.push(error);
                            }

                            return errors;
                        }, []);

                        if (errors.length) {
                            return vow.reject(errors);
                        }
                        return configr;
                    });
                })
                .then(function (configr) {
                    var folders = configr.getFolders(),
                        wids = {},
                        worker;

                    for (var i = 0; i < folders.length; i++) {
                        worker = cluster.fork();
                        wids[worker.id] = folders[i];
                    }

                    cluster.on('online', function (worker) {
                        var folderName = wids[worker.id];
                        worker.send({
                            folderName: folderName
                        });
                    });
                    cluster.on('disconnect', function (worker) {
                        logr.warn('%s folder\'s worker has disconnected', wids[worker.id]);
                    });
                    cluster.on('exit', function (worker, code, signal) {
                        logr.error('%s folder\'s worker %s died (%s)', wids[worker.id], worker.process.pid, signal || code);
                    });
                })
                .fail(onFail)
                .done();

        } else {

            promise
                .then(function (folderName) {
                    var configr = new Configr(basePath, appConfig),
                        config = configr.getFolderConfig(folderName),
                        postr = require('./postrBuilder').getPostr(config.service),
                        schedulr;

                    postr.setup({
                        folderName: folderName,
                        folderPath: configr.getFolderPath(folderName),
                        config: config
                    });
                    schedulr = new require('./Schedulr')(postr);

                    return postr.connect()
                        .always(function (promise) {
                            if (promise.isRejected()) {
                                return vow.reject(
                                    new Err(folderName + ': authenitcation failed')
                                );
                            }
                            logr.info('%s: authenitcated as %s', folderName, promise.valueOf());
                            return schedulr;
                        })
                        .then(function (schedulr) {
                            schedulr.on('posted', function (data) {
                                logr.info('%s: %s posted with id: %s', folderName, data.fileName, data.postId);
                            });
                            schedulr.on('failed', function (data) {
                                logr.error('%s: %s post failed: %s', folderName, data.fileName, data.error);
                            });
                            return schedulr.run();
                        });
                })
                .fail(onFail)
                .done();

            process.on('message', function (data) {
                if (data.folderName) {
                    deferred.resolve(data.folderName);
                }
            });

        }
    }
};


