# pic-postr

Pictures uploader tool, supports [**tumblr**](https://www.tumblr.com) and [**flickr**](https://www.flickr.com) (more services support to come). Uploads given pictures from 
configured folders and watches for new files being added to upload.

## Installation

`npm install pic-postr`

## Usage

Example folders structure
```
/base/folder/
    tumblr-drafts
    tumblr-queue
    flickr-public
```

Folders `tumblr-drafts`, `tumblr-queue` and `flickr-public` could contain some pictures at the run moment or files 
could be added on the fly.    

Runner script (`postr.js`):
``` js
require('pic-postr').init('/base/folder', {
    tumblr: {
        appConsumerKey: '...',
        appSecretKey: '...',
        accessToken: '...',
        accessSecret: '...',
        interval: 30,
        blog: 'the-blog',
        post: {
            caption: 'Feel free to LIKE my photo',
            date: function (filePath) {
                return new Date(require('fs').statSync(filePath).ctime).toISOString()
            }
        }
    },
    flickr: {
        appConsumerKey: '...',
        appSecretKey: '...',
        accessToken: '...',
        accessSecret: '...',
        interval: 10,
        order: 'abc',
        extractIptc: true,
        post: {
            title: function (filePath, metaIptc) {
                return metaIptc.description;
            },
            tags: function (filePath, metaIptc) {
                return metaIptc.keywords ? metaIptc.keywords.split(';').join(' ') : null;
            },
            is_public: 1
        }
    },
    folders: {
        'tumblr-drafts': {
            service: 'tumblr',
            interval: 20,
            order: 'abc',
            post: {
                state: 'draft'
            }
        },
        'tumblr-queue': {
            service: 'tumblr',
            order: 'random',
            post: {
                state: 'queue'
            }
        },
        'flickr-public': {
            service: 'flickr'
        }
    }
});
```

After `node postr.js` execution we'll get main program running, posting and monitoring configured folders with given 
settings by child processes. Could be run as a background service.

```
node postr.js > postr.log 2>&1 &
```

## Options explained

``` js
require('pic-postr').init(baseFolderPath, appConfigOptins);
```

### baseFolderPath

String containing absolute or relative path to the base application folder. Base folder must contain images folders 
configured under the `folder` section of `appConfigOptions`.

### appConfigOptions

Application config object, possible fields are:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logLevel` | `String` | `'warn'` | Optional. Possible values are: `'debug'`, `'info'`, `'warn'`, `'error'` |
| `imConvertPath` | `String` | `'convert'` | Optional. Path to imagemagick's convert utility, if not in PATH |
| `tumblr` | [`tumblrConfigOptions`](#tumblrconfigoptions-and-flickrconfigoptions) | - | Config for Tumblr. Used for folders with `service: 'tumblr'` |
| `flickr` | [`flickrConfigOptions`](#tumblrconfigoptions-and-flickrconfigoptions) | - | Config for Flickr. Used for folders with `service: 'flickr'` |
| `folders` | `Object` | - | Object with keys matching picture folders inside `baseFolderPath` directory, values are: [`folderConfigOptions`](#folderconfigoptions) |

### tumblrConfigOptions and flickrConfigOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appConsumerKey` | `String` | - | Service API application consumer key for OAuth | 
| `appSecretKey` | `String` | - | Service API application secret key for OAuth | 
| `accessToken` | `String` | - | Service API OAuth access token | 
| `accessSecret` | `String` | - | Service API OAuth access secret |
| `interval` | `Number` | `60` | Time interval between posts for service, in seconds |
| `order` | `String` | `'abc'` | Optional. Post files in given order (file name is used for sorting). Values: `'abc'`, `'zyx'`, `'random'` | 
| `extractIptc` | `String` | `false` | Optional. Extract IPTC/XMP metadata to be used in [post's fields callbacks](#posts-fields-callbacks). [Metadata fields](https://github.com/achesco/extract-iptc#resulting-meta-object-fields-reference) |
| `post` | [`postConfigOptions`](#postconfigoptions) | N | Data object fields to post config |

#### tumblrConfigOptions (Tumblr-only options)

| Option | Type | Default | Description |
|--------|------|---------|-------------|   
| `blog` | `String` | N | Blog name to post to. Can be overriden with [`folderConfigOptions.blog`](#folderconfigoptions) |

### folderConfigOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `service` | `String` | N | `'tumblr'` or `'flickr'` |
Plus any of the following service-level config fields: `interval`, `order`, `extractIptc`, `post` (and `blog` for 
tumblr) could be overriden on folder level.

### postConfigOptions

Post config options depend on service. Any supported field's config value could be set to function. It'll be called for
every time before posting picture file and should return fiel's value. Function arguments are:
* `filePath` path to file being posted
* `metaIptc` metadata parsed from image being posted. Requires `extractIptc` optinon set to `true`.

Return value should be service's API compatible value. Return `null` or `undefined` to ignore and use default instead.

#### Tumblr's postConfigOptions

Supported fields are: `state`, `tags`, `tweet`, `date`, `format`, `slug`, `caption`, `link`, `source`.
[Description and possible values](https://www.tumblr.com/docs/en/api/v2#posting)

#### Flickr's postConfigOptions

Supported fields are: `title`, `description`, `tags`, `is_public`, `is_friend`, `is_family`, `safety_level`, `content_type`, `hidden`.
[Description and possible values](https://www.flickr.com/services/api/upload.api.html)
