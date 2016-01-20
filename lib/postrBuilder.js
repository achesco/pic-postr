var vow = require('vow'),
    _ = require('lodash'),
    path = require('path'),
    Err = require('./Err'),
    logr = require('./logr'),
    ExtractIptc = require('extract-iptc'),
    Postr;

/**
 * Concrete service interaction methods implementation object
 * @typedef {Object} PostrImpl
 * @property {Object} [defaultOptions]
 * @property {Function} connect
 * @property {Function} getPost
 * @property {Function} post
 * @property {Function} getLog
 * @property {Object} [defaultOptions]
 */

/**
 * Postr API object. 'setup' and 'connect' should be called before further use
 * @typedef {Object} PostrApi
 * @property {Function} setup
 * @property {Function} connect
 * @property {Function} post
 * @property {Function} getConfig
 * @property {Function} getFolderPath
 */

/**
 * Postr builder class, builds specific postr instance on top
 * of concrete service interaction methods implementation
 * @param {PostrImpl} impl
 * @returns {PostrApi}
 * @constructor
 */
Postr = function (impl) {
    var api = {},
        ctx = {};

    /**
     * Set config options
     * @param {Object} params
     * @param {String} params.folderName
     * @param {String} params.folderPath
     * @param {String} params.imConvertPath
     * @param {Object} params.config
     * @returns {Postr}
     */
    api.setup = function (params) {
        ctx.folderName = params.folderName;
        ctx.folderPath = params.folderPath;
        ctx.config = _.merge({}, impl.defaultOptions || {}, params.config);
        if (params.imConvertPath) {
            ExtractIptc.setImageMagickConvertPath(params.imConvertPath);
        }
        return api;
    };

    /**
     * Connect callback
     * @callback Postr~connectCallback
     * @param {Error} err
     * @param {String} userName
     */
    /**
     * Authenticate client with service, return user name
     * @returns {vow.Promise.<String>}
     */
    api.connect = function () {
        var deferred  = vow.defer(),
            promise = deferred.promise();

        impl.connect.call(ctx, function (err, userName) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(userName);
            }
        });
        return promise;
    };

    /**
     * Post callback
     * @callback Postr~postCallback
     * @param {Error} err
     * @param {String} postId
     */
    /**
     * Post the post data, returns post id
     * @param {String} fileName
     * @returns {vow.Promise.<String>}
     */
    api.post = function (fileName) {
        var filePath = ctx.folderPath + path.sep + fileName,
            deferred = vow.defer(),
            promise = deferred.promise(),
            metaDefered = vow.defer(),
            metaPromise = metaDefered.promise(),
            post = _.merge({}, ctx.config.post);

        if (ctx.config.extractIptc) {
            ExtractIptc.extract(filePath, function (err, meta) {
                metaDefered.resolve(err ? {} : meta);
            });
        } else {
            metaDefered.resolve();
        }

        metaPromise.then(function (meta) {
            var args = [fileName];

            if (meta) {
                args.push(meta);
            }
            Object.keys(post).forEach(function (field) {
                if (typeof post[field] === 'function') {
                    post[field] = post[field].apply(null, args);
                }
            });
            // Clean empty values causing (400 bad request)
            post = _.pick(post, function (val) {
                if (val === null || val === undefined) {
                    return false;
                }
                val = _.trim(String(val));
                return val !== '';
            });

            try { // fs.createReadStream inside implementations
                post = impl.getPost.call(ctx, filePath, post);
                logr.debug('%s: post data: %s', ctx.folderName, impl.getLog.call(ctx, filePath, post));

                impl.post.call(ctx, post, function (err, postId) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(postId);
                    }
                });
            } catch (err) {
                deferred.reject(err);
            }

        }).done();

        return promise;
    };

    /**
     * Get postr config
     * @returns {Object}
     */
    api.getConfig = function () {
        return _.merge({}, ctx.config);
    };

    /**
     * Get working floder path
     * @returns {String}
     */
    api.getFolderPath = function () {
        return ctx.folderPath;
    };

    return api;
};

module.exports = {
    /**
     * Get postr instance by service.
     * @param {String} service
     */
    getPostr: function (service) {
        if (['tumblr', 'flickr', 'fotki'].indexOf(service) !== -1) {
            return new Postr(require('./' + service + 'Postr'));
        } else {
            throw new Err(service + ' service isn\'t supported');
        }
    }
};
