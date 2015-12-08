var _ = require('lodash'),
    fs = require('fs'),
    request = require('request');

/**
 * Yandex.Photo aka Yandex.Fotki poster implementation
 * @see https://tech.yandex.ru/fotki/doc/concepts/About-docpage/
 */
module.exports = {

    /**
     * Create client, get user info
     * @param {Postr~connectCallback} callback
     */
    connect: function (callback) {
        var fotki = require('fotki');
        fotki.auth(this.config.userName, this.config.accessToken);
        fotki.getAlbums()
            .then(function (albums) {
                this.albumsLinks = albums.entries.reduce(function (albums, album) {
                    albums[album.title] = album.links.photos;
                    return albums;
                }, {});
                if (!this.albumsLinks.hasOwnProperty(this.config.album)) {
                    callback(this.config.album + ' album not found');
                } else {
                    callback(null, albums.author);
                }
            }.bind(this))
            .catch(function (err) {
                callback(err);
            });
    },

    /**
     * Forms and returns final post object for given file, based on pre-filled post data object
     * @param {String} filePath
     * @param {PostData} post Pre-filled post data object
     * @returns {PostData}
     */
    getPost: function (filePath, post) {
        delete post.album; // will be taken from posting url
        _.forOwn(post, function (val, field, post) {
            post[field] = String(val);
        });
        post = _.merge(post, {
            image: fs.createReadStream(filePath)
        });
        return post;
    },

    /**
     * Performs post
     * @param {PostData} post Final post object
     * @param {Postr~postCallback} callback
     */
    post: function (post, callback) {
        request(
            {
                url: this.albumsLinks[this.config.album],
                method: 'post',
                headers: {
                    Accept: 'application/json',
                    Authorization: 'OAuth ' + this.config.accessToken
                },
                formData: post
            },
            function (err, httpResponse, body) {
                var postId;

                if (err) {
                    return callback(err);
                }

                if (httpResponse.statusCode === 201) {
                    try {
                        postId = JSON.parse(body).id;
                    } catch (err) {}
                    callback(null, postId);
                } else {
                    callback('HTTP code: ' + httpResponse.statusCode);
                }
            }
        );
    },

    /**
     * Get string value for final post data
     * @param {String} filePath
     * @param {PostData} post Final post object
     * @returns {String}
     */
    getLog: function (filePath, post) {
        return JSON.stringify(_.merge({}, post, {image: filePath}));
    }
};
