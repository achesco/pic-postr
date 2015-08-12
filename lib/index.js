var vow = require('vow'),
    vfs = require('vow-fs'),
    fs = require('fs'),
    _ = require('lodash'),
    Err = require('./Err'),
    Configr = require('./Configr'),
    cluster = require('cluster'),
    log = require('./Logr'),
    deferred = vow.defer(),
    promise = deferred.promise();

module.exports = {

    /**
     * Init and run with options
     * @param {String} basePath Working dir path
     * @param {Object} appConfig Config options
     */
    init: function (basePath, appConfig) {
        basePath = fs.realpathSync(basePath);

        if (cluster.isMaster) {

            vfs.stat(basePath)
                .always(function (promise) {
                    if (promise.isRejected()) {
                        return vow.reject(new Err('Can\'t stat folder by given path (' + basePath + ')'));
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
                    worker.on('message', function (message) {
                        log('%s folder\'s worker message: %s', wids[worker.id], message);
                    });
                    cluster.on('disconnect', function (worker) {
                        log('%s folder\'s worker has disconnected', wids[worker.id]);
                    });
                    cluster.on('exit', function (worker, code, signal) {
                        log('%s folder\'s worker %s died (%s)', wids[worker.id], worker.process.pid, signal || code);
                    });
                })
                .fail(function (error) {
                    log(Err.getFullMessage(error));
                })
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

                    return postr.connect().always(function (promise) {
                        var value = promise.valueOf();

                        if (promise.isRejected()) {
                            return vow.reject(
                                new Err('Authenitcation failed for ' + folderName + ' folder\'s worker')
                            );
                        }
                        process.send('authenitcated as ' + value);
                        return schedulr;
                    });
                })
                .then(function (schedulr) {
                    schedulr.on('posted', function (data) {
                        process.send(data.fileName + ' has posted with, post-id: ' + data.postId);
                    });
                    schedulr.on('failed', function (data) {
                        process.send(data.fileName + ' has failed to post with error: ' + data.error);
                    });
                    return schedulr.run();
                })
                .fail(function (error) {
                    log(Err.getFullMessage(error));
                })
                .done();

            process.on('message', function (data) {
                if (data.folderName) {
                    deferred.resolve(data.folderName);
                }
            });

        }
    }
};


