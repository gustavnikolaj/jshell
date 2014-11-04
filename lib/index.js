var spawn = require('child_process').spawn;

function Jshell(args) {
    this.commands = [];

    if (Array.isArray(args)) {
        this.pipe.apply(this, args);
    }
}

Jshell.prototype.pipe = function () {
    var args = Array.prototype.slice.call(arguments);
    this.commands.push(args);
    return this;
};

Jshell.prototype.lines = function (callback) {

    var spawnedCommands = this.commands.map(function (command) {
        return spawn(command[0], command.slice(1));
    });

    spawnedCommands.forEach(function (spawnedCommand, index) {
        if (index > 0) {
            spawnedCommands[index - 1].stdout.pipe(spawnedCommand.stdin);
        }
    });

    var buffer = '';
    spawnedCommands[spawnedCommands.length - 1].stdout.on('data', function (data) {
        buffer += data;
    }).on('end', function () {
        var lines = buffer.split('\n').filter(function (line) { return line; });
        callback(null, lines);
    });
};

function jshell() {
    var args = Array.prototype.slice.call(arguments);
    return new Jshell(args);
}

module.exports = jshell;
