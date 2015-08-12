var _ = require('lodash'),
    path = require('path'),
    vow = require('vow'),
    preprocess = require('./preprocess');

/**
 * @typedef {Object} PostData
 */

/**
 * Preprocess post data based on config options
 * @param {Object} config
 * @param {PostData} post
 * @returns {vow.Promise.<PostData>}
 */
function preprocessPost(config, post) {
    var filePath = post.data,
        promises = {};

    if (config.extractTags) {
        promises.tags = preprocess.tags(filePath);
    }
    if (config.extractCaption) {
        promises.caption = preprocess.caption(filePath);
    }

    /**
     * Update post field with extracted value or callback
     * @param {Object} post Post data
     * @param {String} field Field name
     * @param {String} [value]
     */
    function updatePostField(post, field, value) {
        if (typeof post[field] === 'function') {
            post[field] = post[field].call(null, filePath, value);
        }
        if (value) {
            post[field] = value;
        }
    }

    return vow.all(promises).then(function (values) {
        if (values.tags || post.tags) {
            updatePostField(post, 'tags', values.tags);
        }
        if (values.caption || post.caption) {
            updatePostField(post, 'caption', values.caption);
        }
        if (post.date) {
            updatePostField(post, 'date');
        }
        if (post.slug) {
            updatePostField(post, 'slug');
        }

        // Clean empty values causing (400 bad request)
        return _.pick(post, Boolean);
    });
}


/**
 * Tumblr poster implementation
 * @see https://www.tumblr.com/docs/en/api/v2#posting
 */
module.exports = {

    defaultOptions: {
        extractTags: false,
        post: {
            state: 'draft'
        }
    },

    /**
     * Create client, get user info
     * @param {Postr~connectCallback} callback
     */
    connect: function (callback) {
        this.client = require('tumblr.js').createClient({
            consumer_key: this.config.appConsumerKey,
            consumer_secret: this.config.appSecretKey,
            token: this.config.accessToken,
            token_secret: this.config.accessSecret
        });
        this.client.userInfo(function (err, data) {
            if (err) {
                return callback(err);
            }
            return callback(null, data.user.name);
        });
    },

    /**
     * Perform post
     * @param {String} fileName
     * @param {Postr~postCallback} callback
     */
    post: function (fileName, callback) {
        var config = this.config,
            filePath = this.folderPath + path.sep + fileName,
            post = _.merge({}, config.post, {
                type: 'photo',
                data: filePath
            });

        preprocessPost(config, post).then(function (post) {
            this.client.photo(config.blog, post, function (err, data) {
                if (err) {
                    return callback(err);
                }
                return callback(null, data.id);
            });
        }.bind(this)).done();
    }
};
