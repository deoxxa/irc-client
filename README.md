irc-client
==========

Basic IRC client using irc-protocol.

Overview
--------

`irc-client` makes your life easier if you're implementing anything that acts
as an IRC client by providing some common base functionality. Much of this
functionality is exposed using events like `message:private` or `channel:join`.
Read on through the API section for more information.

It's expected that one would extend the `Client` "class" and add their own
features on top. To that end, the core features of `irc-client` will remain
quite minimal.

Installation
------------

Available via [npm](http://npmjs.org/):

> $ npm install irc-client

Or via git:

> $ npm install git://github.com/deoxxa/irc-client.git

API
---

**constructor**

Constructs a new client object with the supplied options.

```javascript
new Client([options]);
```

```javascript
// basic instantiation
var client = new Client({
  server: {
    host: "127.0.0.1",
    port: 6667,
  },
  nickname: "example",
  username: "irc-client",
  realname: "example client",
  channels: [
    "#channel",
    ["#example", "password-for-example"],
  ],
});
```

Arguments

* _options_ - an object containing parameters used to instantiate the client.

Options

* _server_ - an object with `host` and optionally `port` parameters. The default
  is `{host: "127.0.0.1", port: 6667}`.
* _nickname_ - a string containing the nickname for the client.
* _username_ - a string containing the username for the client.
* _realname_ - a string containing the "real name" for the client.
* _channels_ - an array containing channels to join upon connection to the
  server. If an entry is a string, it will be joined with no password, but if it
  is an array, it will be treated as `[channel, password]` and joined as such.

**join**

Joins a channel, optionally calling a callback with a possible error value when
complete.

```javascript
client.join(channel, [password], [cb]);
```

```javascript
client.join("#example", "example-password", function(err) {
  if (err) {
    console.log("couldn't join #example: " + err);
  } else {
    console.log("joined #example");
  }
});
```

Arguments

* _channel_ - a channel name. Easy.
* _password_ - the password for the channel. Optional.
* _cb_ - a callback that will be called, possibly with an error, when either the
  channel is joined, or an error happens. If there is no error, the first
  argument will be null. Also optional.

**part**

Leaves a channel.

```javascript
client.part(channel, reason);
```

```javascript
client.part("#example", "going to sleep");
```

Arguments

* _channel_ - the name of a channel that you should be currently in. The effects
  are undefined if you're not already in that channel.
* _reason_ - the "reason" for parting the channel. Don't look back in anger.

**say**

Sends a message (using PRIVMSG) to a particular target.

```javascript
client.say(to, text);
```

```javascript
client.say("#channel", "good news, everyone");

// OR

client.say("friend", "hi, friend");
```

Arguments

* _to_ - the target of the message. Can be anything that a PRIVMSG will work
  against. This is kind of defined by the server.
* _text_ - the content of the message. Can't contain newlines or anything else
  that the server doesn't approve of.

**ctcp**

Sends a CTCP-style message to a particular target. Mostly a convenience wrapper
around `.say()`.

```javascript
client.ctcp(to, text);
```

```javascript
client.ctcp("friend", "TIME");
```

Arguments

(see `say()` above)

**notice**

Sends a NOTICE message to a particular target.

```javascript
client.notice(to, text);
```

```javascript
client.notice("friend", "i'm disconnecting");
```

Arguments

(see `say()` above);

Example
-------

Also see [example.js](https://github.com/deoxxa/irc-client/blob/master/example.js).

```javascript
var net = require("net");

var Client = require("irc-client");

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
```

License
-------

3-clause BSD. A copy is included with the source.

Contact
-------

* GitHub ([deoxxa](http://github.com/deoxxa))
* Twitter ([@deoxxa](http://twitter.com/deoxxa))
* ADN ([@deoxxa](https://alpha.app.net/deoxxa))
* Email ([deoxxa@fknsrs.biz](mailto:deoxxa@fknsrs.biz))
