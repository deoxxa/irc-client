#!/usr/bin/env node

var fs = require("fs"),
    net = require("net"),
    path = require("path");

function ip_to_long(ip) {
  return ip.split(".").reduce(function(i, v) {
    return i * 256 + parseInt(v, 10);
  }, 0);
}

var Client = require("./index");

var XDCC = function XDCC() {
  Client.apply(this, arguments);

  this.regexes_private = [];
  this.regexes_public = [];

  this.on("message:public", function(from, to, message) {
    this.regexes_public.filter(function(regex) {
      var matches;
      if (matches = regex[0].exec(message)) {
        regex[1](from, to, message, matches);
      }
    }.bind(this));
  }.bind(this));

  this.on("message:private", function(from, to, message) {
    this.regexes_private.filter(function(regex) {
      var matches;
      if (matches = regex[0].exec(message)) {
        regex[1](from, to, message, matches);
      }
    }.bind(this));
  }.bind(this));

  this.transfers = [];
};
XDCC.prototype = Object.create(Client.prototype, {properties: {constructor: XDCC}});

XDCC.prototype.match_private = function match_private(regex, cb) {
  this.regexes_private.push([regex, cb]);
};

XDCC.prototype.match_public = function match_public(regex, cb) {
  this.regexes_public.push([regex, cb]);
};

XDCC.prototype.match = function match(regex, cb) {
  this.match_private(regex, cb);
  this.match_public(regex, cb);
};

var xdcc = new XDCC({
  channels: ["#channel"],
  my_ip: "127.0.0.1",
});

xdcc.on("irc", function(message) {
  console.log(message);
});

var files = {
  "10": "test.data",
};

xdcc.match_private(/^xdcc send (\d+)/i, function(from, to, message, matches) {
  if (!files[matches[1]]) {
    xdcc.say(from.nick, "パック＃" + matches[1] + "がない");
    return;
  }

  var server = net.createServer(function(c) {
    fs.createReadStream(path.join(__dirname, files[matches[1]])).pipe(c);
    server.close();
  }).listen(null, xdcc.options.my_ip);

  fs.stat(path.join(__dirname, files[matches[1]]), function(err, stats) {
    xdcc.ctcp(from.nick, ["DCC", "SEND", files[matches[1]], ip_to_long(xdcc.options.my_ip), server.address().port, stats.size].join(" "));
  });
});
