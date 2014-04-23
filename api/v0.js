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
            console.log('createEvent: Set title to: ' + titledEvent.title + 
                        ' for event: ' + req.body.message);
          })
        .catch(function (err) {
          console.log('createEvent: Failed to set title ' + err);
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
    .then(function () {
        console.log('createEvent: success!');
      })
    .catch(function (err) {
      resp.error(res, resp.BAD, err);
      console.log("createEvent: Error creating event");
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

    db.events.getWithCreator(req.query.userId)
    .then(function (events) {
        resp.success(res, events);
      })
    .catch(function (err) {
        resp.error(res, resp.NOT_FOUND, err);
      });
  }

  var send = function (req, res) {
    console.log('send')
    RSVP.hash({
        recipients : db.recipients.get(req.params.eventId),
        event      : db.events.get(req.params.eventId),
        user       : db.users.get(req.body.userId),
        message    : db.messages.create(req.body.message, req.params.eventId)
      })
    .then(function (results) {
        resp.success(res, results.message);
        var messageToRecips = results.user.name + ' : ' + req.body.message;
        return _.chain(results.recipients)
          .filter(function (recip) {
            if (!recip.status) {
                  return true;
                }

                return recip.status === 0 || recip.status === 1;
          })
          .map(function (recip) {
            return msg.createMessage(recip.phone, 
                                     messageToRecips, 
                                     results.event.phone);
          }).value();
      })
    .then(msg.sendMessages)
    .catch(function (err) {
      resp.error(res, resp.BAD, err);
      console.log("send: Error sending message");
      console.log(err);
    });
  }

  /* POST /event/:eventId/reply
   *
   */
  var reply = function (req, res) {
    var replyMessage   = req.body.Body
    ,   replyToPhone   = req.body.To
    ,   replyFromPhone = req.body.From
    ,   replyEventId   = req.params.eventId;

    db.recipients.get(replyEventId, replyFromPhone)
    .then(function (recips) {
        var recip = _.first(recips);

        // Curry messeages to all other recipients
        return db.messages.create(replyMessage, replyEventId, recip._id)
          .then(function (messageDoc) {
            resp.success(res, "Noted");
            return recip;
          });
      }, function (err) {
        console.log('reply: Error storing reply: ' + err);

        res.format({
          text : function() {
            res.send("{ Who's Down } \nUnfortunately, you are not invited to this event.");
          }
        });
      })
    .then(function (replier) {
        resp.success(res, "Noted");

        // Curry messeages to all other recipients
        var curryMessagesPromise = 
        db.recipients.get(replyEventId)
        .then(function (allRecipients) {
            var message = replier.name + " : " + replyMessage;

            return _.chain(allRecipients)
              .filter(function (recip) {
                return recip.phone !== replier.phone;
              })
              .filter(function (recip) {
                if (!recip.status) {
                  return true;
                }

                return recip.status === 0 || recip.status === 1;
              })
              .map(function (recip) {
                return msg.createMessage(recip.phone, message, replyToPhone);
              })
              .value();
          })
        .then(msg.sendMessages);

        return RSVP.hash({
          replier         : replier,
          curriedMessages : curryMessagesPromise,
          sentiment       : interpreter.getSentiment(replyMessage),
          messages        : db.messages.get(replyEventId, replier._id)
        })
      })
    .then(function (results) {
      console.log('sentiment: ' + results.sentiment);
      console.log('type: ' + typeof results.replier._id);


      // if (results.messages.length > 2) {
      //   return results.replier;
      // } else {
        return db.recipients.setStatus(results.replier._id, results.sentiment);
      // }
    })
    .then(function (replier) {
      console.log(replier);
    })
    .catch(function (err) {
        console.log('reply: Error: ' + err);

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

  var getEventData = function (req, res) {
    if (!req.params.eventId) {
      resp.error(res, resp.BAD);
      return;
    }

    RSVP.hash({
        messages : db.messages.get(req.params.eventId),
        people   : db.recipients.get(req.params.eventId)
      })
    .then(function (results) {
        resp.success(res, results);
      })
    .catch(function (err) {
        resp.error(res, resp.NOT_FOUND, err);
      });
  }

  var updateRecipient = function (req, res) {
    if (!req.body._id) {
      resp.error(res, resp.BAD);
      return;
    }

    db.recipients.setStatus(db.id(req.body._id), req.body.status)
    .then(function (results) {
        console.log('updateRecipient: ');
        console.log(results);
        resp.success(res, results);
      })
    .catch(function (err) {
        resp.error(res, resp.BAD, err);
      });
  }

  // setAllTitles();
  var base = '/api/v0';

  module.exports = {
    events: {
      path: base + '/event',
      eventPath: base + '/event/:eventId',
      replyPath: base + '/event/:eventId/reply',
      sendPath: base + '/event/:eventId/send',
      create: createEvent,
      getAll: getEvents,
      getEventData: getEventData,
      reply: reply,
      send: send
    },
    user: {
      path: base + '/user',
      post: createUser,
      verifyPath: base + '/verify',
      verify: verifyUser
    },
    recipient: {
      path: base + '/recip',
      put: updateRecipient
    }
  };



})();
