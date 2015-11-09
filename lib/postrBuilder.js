var vow = require('vow'),
    _ = require('lodash'),
    Err = require('./Err'),
    logr = require('./logr'),
    Postr;

/**
 * Concrete service interaction methods implementation object
 * @typedef {Object} PostrImpl
 * @property {Function} connect
 * @property {Function} post
 * @property {Object} [defaultOptions]
 */

/**
 * Postr api by setted up config. Should call 'setup' and 'connect' before futher api calls
 * @typedef {Object} PostrApi
 * @property {Function} setup
 * @property {Function} connect
 * @property {Function} post
 * @property {Function} run
 * @property {Function} scan
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
     * @param {Object} params.config
     * @returns {Postr}
     */
    api.setup = function (params) {
        ctx.folderName = params.folderName;
        ctx.folderPath = params.folderPath;
        ctx.config = _.merge({interval: 60}, impl.defaultOptions, params.config);
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
        var deferred  = vow.defer(),
            promise = deferred.promise();

        impl
            .getPost.call(ctx, fileName)
            .then(function (post) {
                logr.debug('%s: post data: %s', ctx.folderName, JSON.stringify(post));
                impl.post.call(ctx, post, function (err, postId) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(postId);
                    }
                });
            })
            .fail(function (err) {
                deferred.reject(err);
            });

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
        switch (service) {
            case 'tumblr':
                return new Postr(require('./tumblrPostr'));
            default :
                throw new Err(service + ' service is unsupported');
        }
    }
};
