/*global describe, it*/
var expect = require('unexpected')
    .clone()
    .use(require('unexpected-stream'));
var jshell = require('../lib/index');

describe('jshell', function () {
    describe('pipe', function () {
        it('should be able to pipe', function () {
            var stream = jshell('echo', ['foobar'])
                .pipe(jshell('grep', ['bar']));
            return expect(stream, 'to yield output satisfying', new Buffer('foobar\n'));
        });
    });
    describe('args', function () {
        it('should throw when not passing any args', function () {
            return expect(function () {
                jshell();
            }, 'to throw', /pass some arg/);
        });
        it('should allow you to pass a string with a simple command', function () {
            return expect(jshell('echo foobar'), 'to yield output satisfying', new Buffer('foobar\n'));
        });
        it('should allow you to pass a string with a simple command 2', function () {
            return expect(jshell('echo'), 'to yield output satisfying', new Buffer('\n'));
        });
        it('should allow you to pass many strings as args', function () {
            return expect(jshell('echo', 'foo', 'bar'), 'to yield output satisfying', new Buffer('foo bar\n'));
        });
    })

    describe('promise', function () {
        it('should buffer up the and resolve with the value', function (done) {
            jshell('echo foo').then(function (output) {
                expect(output, 'to equal', new Buffer('foobar\n'));
                done();
            })
            //return expect(jshell('echo foobar'), 'to be fulfilled with', new Buffer('foobar\n'));
            // Fails with:
            // expected Duplex to be fulfilled with Buffer([0x66, 0x6F, 0x6F, 0x62, 0x61, 0x72, 0x0A])
            //   The assertion 'to be fulfilled with' is not defined for the type 'Stream',
            //   but it is defined for the type 'Promise'
            //
            // The old api would have required you to call
            // jshell('echo foobar').buffer() before you got a promise.
            // I would like that not to be necessary, as there is no ambiguity
            // wrt. the intention of the caller. As long as there's some check
            // that you don't call both .pipe and .then on the same jshell.
        });
    });

    describe.skip('old tests', function () {
        var stream = require('stream');
        var Writable = stream.Writable;
        var Readable = stream.Readable;
        var util = require('util');
        var Promise = require('bluebird');

        function WritableMemoryStream(options) {
            if (!(this instanceof WritableMemoryStream)) {
                return new WritableMemoryStream(options);
            }
            Writable.call(this, options);
            this.buffer = new Buffer('');
        }
        util.inherits(WritableMemoryStream, Writable);

        WritableMemoryStream.prototype._write = function (chunk, enc, cb) {
            var buffer = (Buffer.isBuffer(chunk)) ?
                chunk : new Buffer(chunk, enc);

            this.buffer = Buffer.concat([this.buffer, buffer]);
            cb();
        };

        it('should be a function', function () {
            expect(jshell, 'to be a function');
        });
        it('should return an object with a lines method', function () {
            expect(jshell('echo', 'foo'), 'to satisfy', {
                lines: expect.it('to be a function')
            });
        });
        it('should return an object with a pipe method', function () {
            expect(jshell('echo', 'foo'), 'to satisfy', {
                pipe: expect.it('to be a function')
            });
        });
        it('should be able to call the constructor without the first command', function () {
            expect(function () {
                jshell();
            }, 'not to throw');
        });
        describe('buffer', function () {
            it('should pass the output buffer of the jshell command to the callback', function (done) {
                jshell('echo', 'foo').buffer(function (err, data) {
                    expect(err, 'to be null');
                    expect(data, 'to equal', new Buffer('foo\n'));
                    done();
                });
            });

            it('supports promises', function (done) {
                var promise = jshell('echo', 'foo').buffer();
                expect(promise, 'to be a', Promise);
                promise.then(function (data) {
                    expect(data, 'to equal', new Buffer('foo\n'));
                }).lastly(done);
            });
        });
        describe('toString', function () {
            it('returns a string representing the command pipeline', function () {
                expect(jshell('echo', 'foo').pipe('grep', 'foo').toString(), 'to equal', 'echo foo | grep foo');
            });
        });

        describe('text', function () {
            it('should pass the output string of the jshell command to the callback', function (done) {
                jshell('echo', 'foo').text(function (err, data) {
                    expect(err, 'to be null');
                    expect(data, 'to equal', 'foo\n');
                    done();
                });
            });

            it('supports promises', function (done) {
                var promise = jshell('echo', 'foo').text();
                expect(promise, 'to be a', Promise);
                promise.then(function (data) {
                    expect(data, 'to equal', 'foo\n');
                }).lastly(done);
            });
        });

        describe('lines', function () {
            it('should pass the output lines of the jshell command to the callback', function (done) {
                jshell('echo', 'foo').lines(function (err, data) {
                    expect(err, 'to be null');
                    expect(data, 'to equal', ['foo']);
                    done();
                });
            });

            it('supports promises', function (done) {
                var promise = jshell('echo', 'foo').lines();
                expect(promise, 'to be a', Promise);
                promise.then(function (data) {
                    expect(data, 'to equal', ['foo']);
                }).lastly(done);
            });
        });
        describe('pipe', function () {
            it('should pipe output to grep', function (done) {
                jshell('echo', 'foo').pipe('grep', 'foo').lines(function (err, data) {
                    expect(err, 'to be null');
                    expect(data, 'to equal', ['foo']);
                    done();
                });
            });
            it('should pipe output to grep with args', function (done) {
                jshell('echo', 'foo').pipe('grep', '-v', 'foo').lines(function (err, data) {
                    expect(err, 'to be null');
                    expect(data, 'to equal', []);
                    done();
                });
            });
            it('should pipe output to a writable stream', function (done) {
                var writableStream = new WritableMemoryStream();
                jshell('echo', 'foo').pipe('grep', 'foo').pipe(writableStream);
                writableStream.on('finish', function () {
                    expect(writableStream.buffer.toString(), 'to equal', 'foo\n');
                    done();
                });
            });
        });
        describe('quoting of arguments', function () {
            it('quotes arguments that contains spaces', function () {
                expect(
                    jshell('ssh', 'foo.example.com', jshell('cat', '/data/logs/foo.log').pipe('grep', 'lorem ipsum').toString()).toString(),
                    'to equal',
                    'ssh foo.example.com "cat /data/logs/foo.log | grep \\"lorem ipsum\\""'
                );
            });
            it('supports multiple levels of quoting', function () {
                expect(
                    jshell('ssh', 'foo.example.com', jshell('ssh', 'bar.example.com', jshell('cat', '/data/logs/foo.log').pipe('grep', 'lorem ipsum').toString()).toString()).toString(),
                    'to equal',
                    'ssh foo.example.com "ssh bar.example.com \\"cat /data/logs/foo.log | grep \\\\"lorem ipsum\\\\"\\""'
                );
            });
        });
        describe('backticks', function () {
            it('should be able to consume a pipe of commands as arguments', function (done) {
                // echo Hello `echo world`
                jshell().pipe('echo', 'Hello', jshell('echo', 'world')).lines(function (err, data) {
                    expect(data, 'to equal', ['Hello world']);
                    done();
                });
            });
        });
        describe.skip('and', function () {
            it('should execute commands in sequence with the && operator', function (done) {
                // (echo 'foo' && echo 'bar' && echo 'baz') | grep -E "foo|baz"
                jshell('echo', 'foo').and('echo', 'bar').and('echo', 'baz').pipe('grep', '-E', 'foo|baz').lines(function (err, data) {
                    expect(data, 'to equal', ['foo', 'baz']);
                    done();
                });
            });
        });
        describe('is readable', function () {
            it('data is forwarded through events', function (done) {
                var sh = jshell('echo', 'foo\nbar\nbaz');
                var chunks = [];
                sh.on('data', function (data) {
                    chunks.push(data);
                });
                sh.on('end', function (data) {
                    expect(Buffer.concat(chunks).toString('utf-8'), 'to equal', 'foo\nbar\nbaz\n');
                    done();
                });
            });
        });
        describe('is writable', function () {
            it('data can be written to the stream', function (done) {
                var writableStream = new WritableMemoryStream();
                var sh = jshell('grep', '-E', 'foo|baz');
                sh.pipe(writableStream);
                sh.write('foo\n', 'utf-8');
                sh.write('bar\n', 'utf-8');
                sh.write('baz\n', 'utf-8');
                sh.write('foo\n', 'utf-8');
                sh.write('bar\n', 'utf-8');
                sh.write('baz\n', 'utf-8');
                sh.end();
                writableStream.on('finish', function () {
                    expect(writableStream.buffer.toString(), 'to equal', 'foo\nbaz\nfoo\nbaz\n');
                    done();
                });
            });
            it('streams can be piped to jshell', function (done) {
                var rs = new Readable();
                rs.push('foo\n');
                rs.push('bar\n');
                rs.push('baz\n');
                rs.push('foo\n');
                rs.push('bar\n');
                rs.push('baz\n');
                rs.push(null);

                var writableStream = new WritableMemoryStream();
                var sh = jshell('grep', '-E', 'foo|baz');
                sh.pipe(writableStream);

                rs.pipe(sh);
                writableStream.on('finish', function () {
                    expect(writableStream.buffer.toString(), 'to equal', 'foo\nbaz\nfoo\nbaz\n');
                    done();
                });
            });
        });
    });
});
