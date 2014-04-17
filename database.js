(function () {
  var mongojs   = require('mongojs')
  ,   mongoKeys = require('./logins').mongo
  ,   _         = require('underscore');
  _.str         = require('underscore.string');
  _.mixin(_.str.exports());

  var consts = {
    duplicate: 11000
  }

  var db = mongojs(mongoKeys.url, ['users', 'events', 'recipients']);

  var createUser = function (user, succ, fail) {
    user['isVerified'] = false;
    user['code'] = Math.floor(Math.random() * Math.pow(10,10));

    db.users.findAndModify({
      query: { phone : user.phone },
      update: user,
      upsert: true,
      new: true
    }, function (err, docs) {
      if (!err) {
        succ(docs);
      } else {
        // if (err.code === consts.duplicate) {
        //   err['duplicate'] = true;
        // } else {
        //   err['duplicate'] = false;
        // }

        fail(err);
      }
    });
  }

  var verifyUser = function (userId, code, succ, fail) {
    db.users.findAndModify({
      query: {
        _id: mongojs.ObjectId(userId),
        code: parseInt(code) },
      update: { $set: { isVerified: true, code: "" } },
      new: true
    }, function (err, docs) {
        if (!err) {
          succ(docs);
        } else {
          fail(err);
        }
      }
    );
  }

  var getUser = function (userId, succ, fail) {
    db.users.find({
      _id: mongojs.ObjectId(userId)
    }, function (err, docs) {
      if (err || !docs) {
        fail(err);
      } else {
        succ(docs[0]);
      }
    });
  }

  /*
   * @param eventData (Object) The data for the event. Must contain properties:
                               userId, message, title, recips
   */
  var createEvent = function (eventData, succ, fail) {
    var dayInMS = 86400000;
    var monthInMS = 2592000000;

    var didInsertEvent = function (eventId, eventPhone) {
      var recipients = eventData.recips;

      for (var i = recipients.length - 1; i >= 0; i--) {
        recipients[i]['event'] = eventId
      };

      db.recipients.insert(recipients, function (err, docs) {
        if (err) {
          fail(err);
        } else {
          succ({
            eventId    : eventId,
            eventPhone : eventPhone
          });
        }
      })
    }

    var didRecieveEventData = function () {
      db.events.insert({
          creator: eventData.userId,
          message: eventData.message,
          title: eventData.title,
          phone: eventData.phone,
          expirDate: new Date(new Date().getTime() + monthInMS)
        }, function (err, docs) {
          if (err) {
            fail(err);
          }

          didInsertEvent(docs._id, docs.phone);
      });
    }

    if (eventData.userId) {
      didRecieveEventData();
    } else {
      fail();
    }
  }
  
  var setTitleForEvent = function(eventId, title, succ, fail) {
    db.events.update({
      _id: eventId
    }, {
      $set : { title : title }
    }, function (err, docs) {
      if (err) {
        fail(err);
      } else {
        succ(docs);
      }
    })
  }

  var getEventsForCreator = function (creator, succ, fail) {
    var didInsertEvent = function (events) {
      var eventIds = _.map(events, function (e) {
        return e._id;
      });

      db.recipients.find({
        event : { $in: eventIds }
      }, function (err, recips) {
        if (err) {
          fail(err);
        }

        var eventsWithPeople = _.map(events, function (e) {
          e.people = _.filter(recips, function (recip) {
            return _.isEqual(recip.event, e._id);
          });

          return e;
        })

        succ(eventsWithPeople);
      });
    }

    db.events.find({
        creator: creator
      }, function (err, docs) {
        if (err) {
          fail(err);
        }

        didInsertEvent(docs);
    });
  }

  var addWithRecipId = function (isAttendee, recipId, eventId, succ, fail) {
    var updateObj = isAttendee ? { 
        $pull    : { rejectees: recipId },
        $addToSet: { attendees: recipId } 
      } : {
        $pull    : { attendees: recipId },
        $addToSet: { rejectees: recipId } 
      }

    db.events.update({
        _id: mongojs.ObjectId(eventId) 
      }, updateObj, function (err, docs) {
        if (err) {
          fail(err);
        }

        succ(docs);
      }
    );    
  }

  var addWithRecipPhone = function (isAttendee, recipPhone, eventId, succ, fail) {
    return function (recipPhone, eventId, succ, fail) {

      db.recipients.find({ 
          phone: recipPhone,
          event: mongojs.ObjectId(eventId)
        }, function (err, docs) {
          if (err || !docs[0]) {
            fail(err);
          }

          addWithRecipId(isAttendee, docs[0]._id, eventId, succ, fail);
        }
      );
    };
  }

  var getNumber = function (succ, fail) {
    var testNumber = "+17313261704";

    succ(testNumber);
  }

  module.exports = {
    getFreeNumber       : getNumber,
    updateOrCreateUser  : createUser,
    verifyUser          : verifyUser,
    getUser             : getUser,
    createEvent         : createEvent,
    getEventsForCreator : getEventsForCreator,
    setTitleForEvent    : setTitleForEvent,
    addAttendee: addWithRecipPhone(true  /* isAttendee */),
    addRejectee: addWithRecipPhone(false /* isAttendee */)
  }

})();
