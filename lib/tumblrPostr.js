var _ = require('lodash');

/**
 * Tumblr poster implementation
 * @see https://www.tumblr.com/docs/en/api/v2#posting
 */
module.exports = {

    /**
     * @type {Object} default tumblr's service options
     */
    defaultOptions: {
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
     * Forms and returns final post object for given file, based on pre-filled post data object
     * @param {String} filePath
     * @param {PostData} post Pre-filled post data object
     * @returns {PostData}
     */
    getPost: function (filePath, post) {
        return _.merge(post, {
            type: 'photo',
            data: filePath
        });
    },

    /**
     * Performs post
     * @param {PostData} post Final post object
     * @param {Postr~postCallback} callback
     */
    post: function (post, callback) {
        this.client.photo(this.config.blog, post, function (err, data) {
            if (err) {
                callback(err);
            } else {
                callback(null, data.id);
            }
        });
    },

    /**
     * Get string value for final post data
     * @param {String} filePath
     * @param {PostData} post Final post object
     * @returns {String}
     */
    getLog: function (filePath, post) {
        return JSON.stringify(post);
    }
};
