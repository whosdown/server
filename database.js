(function () {
  var mongojs   = require('mongojs')
  ,   mongoKeys = require('./logins').mongo
  ,   RSVP      = require('rsvp')
  ,   _         = require('underscore');
  _.str         = require('underscore.string');
  _.mixin(_.str.exports());

  var p = function (resolve, reject, index) {
    return function (err, docs) {
      if (err) {
        reject(err);
      } else {
        resolve(index ? docs[0] : docs);
      }
    };
  }

  var consts = {
    duplicate: 11000
  }

  var db = mongojs(mongoKeys.url, ['users', 'events', 'recipients', 'messages']);

  var exports = {};

  /********************* Users *****************************/


  var createUser = function (user) {
    user['isVerified'] = false;
    user['code'] = Math.floor(Math.random() * Math.pow(10,10));

    var makeUserPromise = new RSVP.Promise(function (res, rej) {
      db.users.findAndModify({
          query: { 
            phone : user.phone 
          },
          update: user,
          upsert: true,
          new: true
        }, p(res, rej))
    });

    return makeUserPromise;
  };

  var verifyUser = function (userId, code) {
    var checkUserPromise = new RSVP.Promise(function (res, rej) {
      db.users.findAndModify({
        query  : {
          _id  : mongojs.ObjectId(userId),
          code : parseInt(code) 
        },
        update : { 
          $set : { 
            isVerified : true, 
            code       : "" 
          } 
        },
        new    : true
      }, p(res, rej));
    });
    return checkUserPromise
  }


  var getUser = function (userId) {
    return new RSVP.Promise(function (res, rej) {
      db.users.find({ _id : mongojs.ObjectId(userId) }, p(res, rej, true));
    });
  }

  exports.users = {
    verify : verifyUser,
    create : createUser,
    get    : getUser
  };

  /********************* Events *****************************/

  var getEvents = function (creatorId) {
    var findEventsPromise = new RSVP.Promise(function (res, rej) {
      db.events.find({ creator : creatorId }).sort({ expirDate : -1 }, p(res, rej))
    })

    var findRecipsPromise = function (eventIds) {
      return new RSVP.Promise(function (res, rej) {
        db.recipients.find({ event : { $in: eventIds } }, p(res, rej))
      });
    }

    return findEventsPromise
    .then(function (events) {
        var eventIds = _.map(events, function (event) {
          return event._id;
        });

        return RSVP.hash({
          events : events,
          recips : findRecipsPromise(eventIds)
        });
      })
    .then(function (results) {
        return _.map(results.events, function (event) {
          event.people = _.filter(results.recips, function (recip) {
            return _.isEqual(recip.event, event._id);
          });

          return event;
        });
      })
  }

  var createEvent = function (eventData) {
    var dayInMS = 86400000;
    var TenDaysInMS = dayInMS * 10;

    var addEventsPromise = function () {
      return new RSVP.Promise(function (res, rej) {
        db.events.insert({
          creator   : eventData.userId,
          message   : eventData.message,
          title     : eventData.title,
          phone     : eventData.phone,
          expirDate : new Date(new Date().getTime() + TenDaysInMS)
        }, p(res, rej));
      });
    }

    var addRecipientsPromise = function (recipients) {
      return new RSVP.Promise(function (res, rej) {
        db.recipients.insert(recipients, p(res, rej));
      });
    }

    return addEventsPromise()
    .then(function (newEvent) {
        var recipients = _.map(eventData.recips, function (recipient) {
          return recipient.event = newEvent._id;
        });

        return addRecipientsPromise(recipients)
        .then(function () {
          return {
            eventId    : newEvent._id,
            eventPhone : newEvent.phone
          };
        })
      });
  };

  var setEventTitle = function (eventId, title) {
    return new RSVP.Promise(function (res, rej) {
      db.events.update({
          _id : eventId
        }, {
          $set : { 
            title : title 
          }
        }, p(res, rej));
    });
  }

  exports.events = {
    create   : createEvent,
    get      : getEvents,
    setTitle : setEventTitle
  };

  /********************* Messages *****************************/


  var setMessage = function (message, recipId, eventId) {
    return db.messages.insert({
      message   : message,
      recipient : recipId,
      event     : mongojs.ObjectId(eventId),
      date      : new Date()
    });
  }

  var getMessages = function (eventId) {
    return new RSVP.Promise(function (res, rej) {
      db.messages.find({
        event : mongojs.ObjectId(eventId)
      }).sort({ date : 1 }, p(res, rej));
    });
  }

  exports.messages = {
    create : setMessage,
    get    : getMessages, 
  }

  /********************* Recipient *****************************/

  var getRecipient = function (eventId, recipPhone) {
    return new RSVP.Promise(function (res, rej) {
      db.recipients.find({
        event : mongojs.ObjectId(eventId),
        phone : recipPhone
      }, p(res, rej, true));
    });
  }

  exports.recipients = {
    get : getRecipient
  }

  module.exports = exports;

})();
