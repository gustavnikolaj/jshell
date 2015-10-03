var spawn = require('child_process').spawn;
var fwd = require('fwd-stream');

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
    return fwd.duplex(sh.stdin, sh.stdout);
}

module.exports = jshell;
