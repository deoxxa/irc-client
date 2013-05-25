#!/usr/bin/env node

var net = require("net");

var Client = require("./");

var Greeter = function Greeter() {
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
Greeter.prototype = Object.create(Client.prototype, {properties: {constructor: Greeter}});

Greeter.prototype.match_private = function match_private(regex, cb) {
  this.regexes_private.push([regex, cb]);
};

Greeter.prototype.match_public = function match_public(regex, cb) {
  this.regexes_public.push([regex, cb]);
};

Greeter.prototype.match = function match(regex, cb) {
  this.match_private(regex, cb);
  this.match_public(regex, cb);
};

var greeter = new Greeter({
  server: {host: "127.0.0.1", port: 6667},
  channels: ["#channel"],
});

greeter.on("irc", function(message) {
  console.log(message);
});

greeter.match(/^(hey|hi|hello)/i, function(from, to, message, matches) {
  var target = to;

  if (target.toLowerCase() === greeter.nickname.toLowerCase()) {
    target = from;
  }

  greeter.say(target, "no, " + matches[1] + " to YOU, " + from.nick);
});
