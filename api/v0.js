(function () {
  var resp        = require('../response').resp
  ,   msg         = require('../messaging')
  ,   db          = require('../database')
  ,   interpreter = require('../interpreter')
  ,   RSVP        = require('rsvp')
  ,   _           = require('underscore');

  /*
   * Call a Node-style async function and return a promise.
   *
   * @param {function} fn A function that accepts a Node-style callback.
   * @param {...*} var_args A variable number of arguments to pass to the Node
   *         function.
   * @return {Promise}
   */
  var q = function(fn) {
    var __slice = Array.prototype.slice;

    var args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];

    return new RSVP.Promise(function(resolve, reject) {
      var cb = function() {
        var err, var_args;
        err = arguments[0], var_args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        if (err) {
          return reject(err);
        } else if (var_args.length > 1) {
          return resolve(Array.prototype.slice.call(var_args));
        } else {
          return resolve(var_args[0]);
        }
      };

      args.push(cb);
      return fn.apply(fn, args);
    });
  };

  /*  POST /event
   *
   * @param req.body = {
              userId  : "52f8359d4cace484d3000004",
              message : "Who's Down for _____",
              people  :  [
                {
                  name: "Joe"
                  phone: 1112223333
                },
                {
                  name: "Bob"
                  phone: 1112223333
                }
              ]
            }
   *
   */
  var createEvent = function (req, res) {
    q(db.events.create, {
            userId  : req.body.userId,
            message : req.body.message,
            title   : undefined,
            recips  : req.body.people,
            phone   : msg.testPhone.number
          })
        .then(function (newEvent) {
            resp.success(res, newEvent);
            q(interpreter.getTitleForMessage, req.body.message)
                .then(function (title) {
                    return q(db.events.setTitle, newEvent.eventId, title)
                  })
                .then(function (titledEvent) {
                    console.log('Set title to: ' + titledEvent.title + 
                                ' for event: ' + req.body.message);
                  })
                .catch(function (err) {
                  console.log(err);
                });
            var replyUrl = 'http://whosd.herokuapp.com/api/v0/event/' + 
                            newEvent.eventId + '/reply'

            return RSVP.hash({
              number   : q(msg.setReplyUrl, newEvent.eventPhone, replyUrl),
              newEvent : newEvent
            });
          })
        .then(function (results) {
            console.log(results.number);
            return RSVP.hash({
              newEvent : newEvent,
              user     : q(db.users.get, req.body.userId)
            });
          })
        .then(function (results) {
            var recips = _.map(req.body.people, function (person) {
              return person.name;
            });
            var recipString = recips.join(", ");
            var messagesToRecips = _.map(req.body.people, function (person) {
              var messages = [];
              var invite = msg.createMessage(
                person.phone, 
                req.body.message + "\n{ " + results.user.name + " via Who's Down }", 
                newEvent.eventPhone);
              var prompt = msg.createMessage(
                person.phone, 
                "{ invited: " + recipString + " }", 
                newEvent.eventPhone);
              messages.push(invite);
              messages.push(prompt);

              return messages;
            });

            return RSVP.all(
              _.map(_.flatten(messagesToRecips), function (message) {
                return q(msg.sendMessage, message);
              })
            )
          })
        .then(function (messages) {
            console.log(messages);
          })
        .catch(function (err) {
            resp.error(res, resp.BAD, err);
            console.log(err);
          });
  };

  /* GET /event
   *
   * @param req.query = {
              userId : "52f8359d4cace484d3000004"
            }
   */
  var getEvents = function(req, res) {
    console.log(req.query)
    if (!req.query.userId) {
      resp.error(res, resp.BAD);
      return;
    }

    db.events.get(req.query.userId)
        .then(function (events) {
            console.log("succy");
            resp.success(res, events);
          },  function (err) {
            console.log("faily");
            res.status(BAD).send("agh");
            resp.error(res, resp.NOT_FOUND, err);
          });
  }

  /* POST /event/:eventId/reply
   *
   */
  var reply = function (req, res) {
    q(db.recipients.get, req.params.eventId, req.body.From)
        .then(function (recip) {
            return q(db.messages.create, 
                          req.body.Body, 
                          recip._id, 
                          req.params.eventId);
          })
        .then(function (messageDoc) {
            console.log(messageDoc);
            resp.success(res, "hmm");
          })
        .catch(function (err) {
            console.log(err);
            res.format({
              text : function() {
                res.send("{ Who's Down } \nUnfortunately, you are not invited to this event.");
              }
            });
          })
  }

  /* POST /user
   *
   * @param req.body = {
              user : {
                name: "Joe"
                phone: 1112223333
              }
            }
   *
   */
  var createUser = function (req, res) {
    q(db.users.create, req.body.user)
        .then(function (user) {
            resp.success(res, out);

            var verifyUrl = "wd://verify?" + out.code;
            var verifyMessage = msg.createMessage(out.phone, verifyUrl);

            return q(msg.sendMessage, verifyMessage);
          })
        .then(function (message) {
            console.log(message);
          })
        .catch(function (err) {
            console.log(err);
            resp.error(res, resp.CONFLICT, err);
          });
  }

  /* POST /verify
   *
   * @param req.body = {
              userId : 1uih4ih3k5j2hkj245,
              code   : 182371823712837128
            }
   *
   */
  var verifyUser = function (req, res) {
    console.log("Verifying... \nid:" + req.body.userId + "\n code: " + req.body.code);

    q(db.users.verify, req.body.userId, req.body.code)
        .then(function (user) {
            if (user && user.isVerified) {
              resp.success(res, out);
            } else {
              resp.error(res, resp.INTERNAL);
            }
          },  function (err) {
            resp.error(res, resp.BAD);
          })
  }

  // var setAllTitles = function () {
  //   db.getEventsForCreator('533cd5fd7de014ee20f42b07', function (out) {
  //     _.map(out, function (event) {
  //       interpreter.getTitleForMessage(event.message, function (title) {
  //         db.setTitleForEvent(event._id, _.str.capitalize(title), function (out) {
  //           console.log('Set title to: ' + title + ' for event: ' + event.message);
  //         }, function (err) {
  //           console.log('failed to commit title');
  //         })
  //       })
  //     })
  //   }, function (err) {
  //     console.log(err);
  //   })
  // }

  var getMessages = function (req, res) {
    if (!req.params.eventId) {
      resp.error(res, resp.BAD);
      return;
    }

    q(db.getMessages, req.params.eventId)
        .then(function (messages) {
            resp.success(res, messages);
          },  function (err) {
            resp.error(res, resp.NOT_FOUND, err);
          });
  }

  // setAllTitles();
  var base = '/api/v0';

  module.exports = {
    events: {
      path: base + '/event',
      messagePath: base + '/event/:eventId',
      replyPath: base + '/event/:eventId/reply',
      create: createEvent,
      getAll: getEvents,
      getMessages: getMessages,
      reply: reply
    },
    user: {
      path: base + '/user',
      post: createUser,
      verifyPath: base + '/verify',
      verify: verifyUser
    }
  };



})();
