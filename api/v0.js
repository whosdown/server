(function () {
  var resp        = require('../response').resp
  ,   msg         = require('../messaging')
  ,   db          = require('../database')
  ,   interpreter = require('../interpreter')
  ,   RSVP        = require('rsvp')
  ,   _           = require('underscore');

  var p = function (resolve, reject, index) {
    return function (err, docs) {
      if (err) {
        reject(err);
      } else {
        resolve(index ? docs[0] : docs);
      }
    };
  }

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
    db.events.create({
        userId  : req.body.userId,
        message : req.body.message,
        title   : undefined,
        recips  : req.body.people,
        phone   : msg.testPhone.number
      })
    .then(function (newEvent) {
        resp.success(res, newEvent);
        interpreter.getTitleForMessage(req.body.message)
        .then(function (title) {
            return db.events.setTitle(newEvent.eventId, title);
          })
        .then(function (titledEvent) {
            console.log('Set title to: ' + titledEvent.title + 
                        ' for event: ' + req.body.message);
          })
        .catch(function (err) {
          console.log('Failed to set title' + err);
        });

        var replyUrl = 'http://whosd.herokuapp.com/api/v0/event/' + 
                        newEvent.eventId + '/reply'

        return RSVP.hash({
          number   : msg.setReplyUrl(newEvent.eventPhone, replyUrl),
          newEvent : newEvent,
          user     : db.users.get(req.body.userId)
        });
      })
    .then(function (results) {
      console.log("results");
      console.log(results.user);
        var recips = _.map(req.body.people, function (person) {
          return person.name;
        });
        var recipString = recips.join(", ");
        var messagesToRecips = _.map(req.body.people, function (person) {
          var messages = [];
          var invite = msg.createMessage(
            person.phone, 
            req.body.message + "\n{ " + results.user.name + " via Who's Down }", 
            results.newEvent.eventPhone);
          var prompt = msg.createMessage(
            person.phone, 
            "{ invited: " + recipString + " }", 
            results.newEvent.eventPhone);
          messages.push(invite);
          messages.push(prompt);

          return messages;
        });

        return msg.sendMessages(messagesToRecips);
      })
    .catch(function (err) {
      resp.error(res, resp.BAD, err);
      console.log("Error creating event");
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
    if (!req.query.userId) {
      resp.error(res, resp.BAD);
      return;
    }

    db.events.get(req.query.userId)
    .then(function (events) {
        resp.success(res, events);
      })
    .catch(function (err) {
        resp.error(res, resp.NOT_FOUND, err);
      });
  }

  /* POST /event/:eventId/reply
   *
   */
  var reply = function (req, res) {
    db.recipients.get(req.params.eventId, req.body.From)
    .then(function (recip) {
        return db.messages.create(req.body.Body, recip._id, req.params.eventId);
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
    db.users.create(req.body.user)
    .then(function (user) {
        resp.success(res, out);

        var verifyUrl = "wd://verify?" + out.code;
        var verifyMessage = msg.createMessage(out.phone, verifyUrl);

        return msg.sendMessage(verifyMessage);
      })
    .then(console.log)
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

    db.users.verify(req.body.userId, req.body.code)
    .then(function (user) {
        if (user && user.isVerified) {
          resp.success(res, out);
        } else {
          resp.error(res, resp.INTERNAL);
        }
      })
    .catch(function (err) {
      resp.error(res, resp.BAD, err);
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

    db.messages.get(req.params.eventId)
    .then(function (messages) {
        resp.success(res, messages);
      })
    .catch(function (err) {
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
