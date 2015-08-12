var _ = require('lodash');

/**
 * Sorter for files list
 * @param {'rand'|'abc'|'zyx'} [order='abc']
 * @constructor
 */
var Sortr = function (order) {
    var api = {},
        list = [],
        needUpdate;
    order = order ? (['zyx', 'random'].indexOf(order) === -1 ? 'abc' : order) : 'abc';

    /**
     * Set list to sort
     * @param {String[]} files
     */
    api.setList = function (files) {
        list = files;
    };

    /**
     * Update list order
     */
    api.update = function () {
        needUpdate = order !== 'random';
    };

    /**
     * Get next item
     * @returns {String}
     */
    api.next = function () {
        var item;

        if (!list.length) {
            return item;
        }

        if (order === 'random') {
            item = _.pullAt(list, _.random(0, list.length - 1));
        } else {
            if (needUpdate) {
                list.sort();
            }
            item = list[order === 'abc' ? 'shift' : 'pop']();
        }
        return item;
    };

    api.update();

    return api;
};

module.exports = Sortr;
