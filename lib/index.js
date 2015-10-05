var spawn = require('child_process').spawn;
var fwd = require('fwd-stream');
var Promise = require('rsvp').Promise;

function jshell(cmd) {
    var args;
    if (arguments.length > 1) {
        if (Array.isArray(arguments[1])) {
            args = [cmd, arguments[1]]
        } else {
            args = [cmd, Array.prototype.slice.call(arguments, 1)];
        }
    } else if (arguments.length === 1) {
        args = cmd.split(' ')
        args = [args[0], args.slice(1)]
    } else {
        throw new Error('you must pass some arguments')
    }
    var sh = spawn.apply(null, args);
    var duplex = fwd.duplex(sh.stdin, sh.stdout);
    var promise;

    duplex.then = function () {
        if (!promise) {
            promise = new Promise(function(resolve, reject) {
                var chunks = [];
                duplex.on('data', function (chunk) {
                    chunks.push(chunk);
                }).on('end', function () {
                    resolve(Buffer.concat(chunks));
                }).on('error', function (err) {
                    reject(err);
                })
            });
        }
        return promise.then.apply(promise, arguments);
    };

    return duplex;
}

module.exports = jshell;
