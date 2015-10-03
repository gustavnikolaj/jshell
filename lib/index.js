var spawn = require('child_process').spawn;
var fwd = require('fwd-stream');

function jshell(str) {
    var sh = spawn.apply(null, arguments);
    return fwd.duplex(sh.stdin, sh.stdout);
}

module.exports = jshell;
