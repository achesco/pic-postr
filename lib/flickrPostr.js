var _ = require('lodash'),
    fs = require('fs');

/**
 * Flickr poster implementation
 * @see https://www.flickr.com/services/api/upload.api.html
 */
module.exports = {

    /**
     * Create client, get user info
     * @param {Postr~connectCallback} callback
     */
    connect: function (callback) {
        this.client = require('flickr-with-uploads')(
            this.config.appConsumerKey, // consumer_key
            this.config.appSecretKey, // consumer_secret
            this.config.accessToken, // oauth_token
            this.config.accessSecret
        );
        this.client({method: 'flickr.test.login'}, function(err, data) {
            if (err) {
                return callback(err);
            }
            return callback(null, data.user[0].username[0]);
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
            method: 'upload',
            photo: fs.createReadStream(filePath)
        });
    },

    /**
     * Performs post
     * @param {PostData} post Final post object
     * @param {Postr~postCallback} callback
     */
    post: function (post, callback) {
        this.client(post, function (err, data) {
            if (err) {
                return callback(err);
            }
            return callback(null, data.photoid[0]);
        });
    },

    /**
     * Get string value for final post data
     * @param {String} filePath
     * @param {PostData} post Final post object
     * @returns {String}
     */
    getLog: function (filePath, post) {
        return JSON.stringify(_.merge({}, post, {photo: filePath}));
    }
};
