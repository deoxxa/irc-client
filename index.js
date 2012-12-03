var net = require("net"),
    events = require("events"),
    util = require("util");

var Protocol = require("irc-protocol");

var Client = module.exports = function Client(options) {
  events.EventEmitter.call(this);

  this.options = options || {};

  this.options.channels = this.options.channels || [];
  this.options.server = this.options.server || {host: "127.0.0.1", port: 6667};

  this.socket = this.options.socket || null;
  this.nickname = this.options.nickname || "irksomen";
  this.username = this.options.username || "irksomeu";
  this.realname = this.options.realname || "irksomer";
  this.channels = [];

  this.parser = new Protocol.Parser();
  this.serialiser = new Protocol.Serialiser();

  if (!this.socket) {
    this.socket = net.createConnection(this.options.server.port, this.options.server.host);
  }

  this.socket.pipe(this.parser);
  this.serialiser.pipe(this.socket);

  this.parser.on("data", function(message) {
    this.emit("irc", message);

    this.emit(["irc", message.command.toLowerCase()].join(":"), message);

    if (Protocol.Numerics[message.command]) {
      this.emit(["irc", Protocol.Numerics[message.command].toLowerCase()].join(":"), message);
    }
  }.bind(this));

  this.once("irc:welcome", function(message) {
    this.options.channels.forEach(function(channel) {
      if (typeof channel === "string") {
        this.join(channel);
      } else if (typeof channel === "object" && channel instanceof Array && channel.length === 2) {
        this.join(channel[0], channel[1]);
      }
    }.bind(this));
  }.bind(this));

  this.on("irc:ping", function(message) {
    this.serialiser.write({command: "PONG", parameters: message.parameters});
  }.bind(this));

  this.on("irc:join", function(message) {
    this.emit("channel:join", message.parameters[0], message.prefix);
  }.bind(this));

  this.on("irc:part", function(message) {
    this.emit("channel:part", message.parameters[0], message.prefix);
  }.bind(this));

  this.on("irc:privmsg", function(message) {
    var privacy = "public";

    if (message.parameters[0].toLowerCase() === this.nickname.toLowerCase()) {
      privacy = "private";
    }

    if (message.parameters[1].substr(0, 1) === message.parameters[1].substr(-1, 1) === "\u0001") {
      this.emit("ctcp:" + privacy, message.prefix, message.parameters[0], message.parameters[1].substr(1, message.parameters[1].length - 2));
    } else {
      this.emit("message:" + privacy, message.prefix, message.parameters[0], message.parameters[1]);
    }
  });

  this.on("irc:join", function(message) {
    if (message.prefix.nick === this.nickname && this.channels.indexOf(message.parameters[0].toLowerCase()) === -1) {
      this.channels.push(message.parameters[0].toLowerCase());
    }
  }.bind(this));

  this.serialiser.write({command: "NICK", parameters: [this.nickname]});
  this.serialiser.write({command: "USER", parameters: [this.username, 0, 0, this.realname]});
};
util.inherits(Client, events.EventEmitter);

Client.prototype.join = function join(channel, password, cb) {
  if (typeof password === "function" && typeof cb === "undefined") {
    cb = password;
    password = null;
  }

  var on_success = function on_success(message) {
    if (message.parameters[0].toLowerCase() === channel.toLowerCase()) {
      this.removeListener("join", on_success);
      if (typeof cb === "function") { cb(); }
    }
  }.bind(this);
  this.on("irc:join", on_success);

  var errors = ["ERR_BANNEDFROMCHAN", "ERR_INVITEONLYCHAN", "ERR_BADCHANNELKEY", "ERR_CHANNELISFULL", "ERR_BADCHANMASK", "ERR_NOSUCHCHANNEL", "ERR_TOOMANYCHANNELS"];
  var on_error = function on_error(message) {
    if (message.parameters[0].toLowerCase() === channel.toLowerCase()) {
      errors.forEach(function(e) { this.removeListener(e, on_error); });
      if (typeof cb === "function") { cb(Error("couldn't join channel " + channel + ", got error " + message.command)); }
    }
  }.bind(this);
  errors.forEach(function(e) { this.on(["irc", e.toLowerCase()].join(":"), on_error); }.bind(this));

  this.serialiser.write({command: "JOIN", parameters: [channel]});
};

Client.prototype.part = function part(channel, reason) {
  this.serialiser.write({command: "PART", parameters: [channel, reason]});
};

Client.prototype.say = function say(to, text) {
  this.serialiser.write({command: "PRIVMSG", parameters: [to, text]});
};

Client.prototype.ctcp = function ctcp(to, text) {
  this.say(to, "\u0001" + text + "\u0001");
};

Client.prototype.notice = function notice(to, text) {
  this.serialiser.write({command: "NOTICE", parameters: [to, text]});
};
