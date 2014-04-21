(function () {
  var resp        = require('../response').resp
  ,   msg         = require('../messaging')
  ,   db          = require('../database')
  ,   interpreter = require('../interpreter')
  ,   _           = require('underscore');

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
  var createEvent = function(req, res) {
    var sendTexts = function (userName, fromPhone) {
      var recips = _.map(req.body.people, function (person) {
        return person.name;
      });
      var recipString = recips.join(", ");
      var messagesToRecips = _.map(req.body.people, function (person) {
        var messages = [];
        var invite = msg.createMessage(person.phone, 
          req.body.message + "\n{ " + userName + " via Who's Down }", fromPhone);
        var prompt = msg.createMessage(person.phone, 
          "{ invited: " + recipString + " }", fromPhone);
        messages.push(invite);
        messages.push(prompt);

        return messages;
      });

      msg.sendMessages(_.flatten(messagesToRecips, true));
    }

    var failure = function (err) {
      if (err) {
        resp.error(res, resp.CONFLICT, err);
      } else {
        resp.error(res, resp.BAD);
      }
      return;
    }

    var success = function (out) {
      resp.success(res, out);

      msg.setReplyUrl(
        out.eventPhone, 
        'http://whosd.herokuapp.com/api/v0/event/' + out.eventId + '/reply',
        function (number) { 
          console.log(number.smsUrl);
          db.getUser(req.body.userId, function (user) {
            sendTexts(user.name, out.eventPhone);
          }, function (err) {
            console.log('failed to get user name');
          })
      });

      interpreter.getTitleForMessage(req.body.message, function (title) {
        db.setTitleForEvent(out.eventId, title, function (out) {
          console.log('Set title to: ' + title + ' for event: ' + req.body.message);
        }, function (err) {
          console.log('failed to commit title');
        })
      })
    }

    db.createEvent({
      userId  : req.body.userId,
      message : req.body.message,
      title   : undefined,
      recips  : req.body.people,
      phone   : msg.testPhone.number
    }, success, failure);
  }

  /* GET /event
   *
   * @param req.query = {
              userId : "52f8359d4cace484d3000004"
            }
   */
  var getEvents = function(req, res) {
    var failure = function (err) {
      resp.error(res, resp.NOT_FOUND, err);
    }

    var success = function (out) {
      resp.success(res, out);
    }

    if (!req.query.userId) {
      resp.error(res, resp.BAD);
      return;
    }

    db.getEventsForCreator(req.query.userId, success, failure);
  }

  /* POST /event/:eventId/reply
   *
   */
  var reply = function (req, res) {
    var failure = function (err) {
      res.format({
        text : function() {
          res.send("{ Who's Down } \nUnfortunately, you are not invited to this event.");
        }
      })
    }

    var success = function (recip) {
      db.recordMessage(req.body.Body, recip._id, req.params.eventId 
         , function (messageDoc) {
          // Do interpretations
          console.log(messageDoc);
        }, function (err) {
          console.log('failed to store message');
      })
      resp.success(res, "hmm");
    }

    db.findRecipient(req.params.eventId, req.body.From, success, failure);
    // console.log(req.body);
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
    var failure = function (err) {
      resp.error(res, resp.CONFLICT, err);
    }

    var success = function (out) {
      resp.success(res, out);

      var verifyUrl = "wd://verify?" + out.code;
      var verifyMessage = msg.createMessage(out.phone, verifyUrl);

      msg.sendMessage(verifyMessage);
    }

    db.updateOrCreateUser(req.body.user, success, failure);
    
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
    var failure = function (err) {
      resp.error(res, resp.BAD);
      return;
    }

    var success = function (out) {
      if (out && out.isVerified) {
        resp.success(res, out);
      } else {
        resp.error(res, resp.INTERNAL);
      }
    }

    console.log("Verifying... \nid:" + req.body.userId + "\n code: " + req.body.code);

    db.verifyUser(req.body.userId, req.body.code, success, failure);
  }

  var setAllTitles = function () {
    db.getEventsForCreator('533cd5fd7de014ee20f42b07', function (out) {
      _.map(out, function (event) {
        interpreter.getTitleForMessage(event.message, function (title) {
          db.setTitleForEvent(event._id, _.str.capitalize(title), function (out) {
            console.log('Set title to: ' + title + ' for event: ' + event.message);
          }, function (err) {
            console.log('failed to commit title');
          })
        })
      })
    }, function (err) {
      console.log(err);
    })
  }

  var getMessages = function (req, res) {
    var failure = function (err) {
      resp.error(res, resp.NOT_FOUND, err);
    }

    var success = function (out) {
      resp.success(res, out);
    }

    if (!req.params.eventId) {
      resp.error(res, resp.BAD);
      return;
    }

    db.getMessages(req.params.eventId, success, failure);
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
