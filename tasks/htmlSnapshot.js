/*
 * grunt-html-snapshot
 *
 * Copyright (c) 2013 Christoph Burgdorf, contributors
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

    var fs          = require("fs"),
        path        = require("path"),
        phantom     = require("grunt-lib-phantomjs").init(grunt);

    var urlsArray;

    var asset = path.join.bind(null, __dirname, '..');

    grunt.registerMultiTask('htmlSnapshot','fetch html snapshots', function(){

        var options = this.options({
          urls: [],
          urlsFunction: null,
          msWaitForPages: 500,
          fileNamePrefix: 'snapshot_',
          snapshotPath: '',
          sitePath: '',
          removeScripts: false
        });

        var sanitizeFilename = function(name){
            return name.replace(/#|\/|\!/g,'_') || '';
        };

        var isLastUrl = function(url){
            return urlsArray[urlsArray.length - 1] === url;
        };

        var getUrls = function(cb) {
            if (options.urlsFunction) {
                return options.urlsFunction( function(err, callbackUrls) {
                    urlsArray = callbackUrls;
                    cb();
                })
            }

            urlsArray = options.urls;
            cb();
        }

        phantom.on("error.onError", function (msg, trace) {
            grunt.log.writeln('error: ' + msg);
            phantom.halt();
        });

        phantom.on("console", function (msg, trace) {
            grunt.log.writeln(msg);
        });

        phantom.on("htmlSnapshot.pageReady", function (msg, url) {

            var plainUrl = url.replace(sitePath, '');

            var fileName =  options.snapshotPath +
                            options.fileNamePrefix +
                            sanitizeFilename(plainUrl) +
                            '.html';

            if (options.removeScripts){
                msg = msg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            }

            grunt.file.write(fileName, msg);
            grunt.log.writeln(fileName, 'written');
            phantom.halt();

            isLastUrl(plainUrl) && done();
        });

        var sitePath = options.sitePath;

        var done = this.async();
        getUrls( function() {
            grunt.util.async.forEachSeries(urlsArray, function(url, next) {

                phantom.spawn(sitePath + url, {
                    // Additional PhantomJS options.
                    options: {
                        phantomScript: asset('phantomjs/bridge.js'),
                        msWaitForPages: options.msWaitForPages
                    },
                    // Complete the task when done.
                    done: function (err) {
                        if (err) {
                            // If there was an error, abort the series.
                            done();
                        }
                        else {
                            // Otherwise, process next url.
                            next();
                        }
                    }
                });
            });
            grunt.log.writeln('running html-snapshot task...hold your horses');
        });
    });
};
