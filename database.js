(function () {
  var mongojs   = require('mongojs')
  ,   RSVP      = require('rsvp')
  ,   _         = require('underscore');
  _.str         = require('underscore.string');
  _.mixin(_.str.exports());

  var mongoKeys = require('./logins').mongo
  ,   utils     = require('./utils');

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
        }, utils.p(res, rej))
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
      }, utils.p(res, rej));
    });
    return checkUserPromise;
  }


  var getUser = function (userId) {
    return new RSVP.Promise(function (res, rej) {
      db.users.find({ _id : mongojs.ObjectId(userId) }, utils.p(res, rej, true));
    });
  }

  exports.users = {
    verify : verifyUser,
    create : createUser,
    get    : getUser
  };

  /********************* Events *****************************/

  var getEvents = function (eventId) {
    return new RSVP.Promise(function (res, rej) {
      db.events.find({ 
        _id  : mongojs.ObjectId(eventId),
        dead : { $exists: false }
      }, utils.p(res, rej, true));
    }); 
  }

  var getEventsWithCreatorId = function (creatorId) {
    var findEventsPromise = new RSVP.Promise(function (res, rej) {
      db.events.find({ 
        creator : creatorId,
        dead    : { $exists: false }
      }).sort({ expirDate : -1 }, utils.p(res, rej))
    })

    var findRecipsPromise = function (eventIds) {
      return new RSVP.Promise(function (res, rej) {
        db.recipients.find({ event : { $in: eventIds } }, utils.p(res, rej))
      });
    }

    return findEventsPromise
    .then(function (events) {
        return RSVP.hash({
          events : events,
          recips : findRecipsPromise( _.pluck(events, '_id'))
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
        }, utils.p(res, rej));
      });
    }

    var addRecipientsPromise = function (recipients) {
      return new RSVP.Promise(function (res, rej) {
        db.recipients.insert(recipients, utils.p(res, rej));
      });
    }

    return addEventsPromise()
    .then(function (newEvent) {
        var recipients = _.map(eventData.recips, function (recipient) {
          recipient.event = newEvent._id;
          return recipient;
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

  var removeEvent = function (eventId) {
    var removeMessagesPromise = new RSVP.Promise(function (res, rej) {
      db.messages.remove({
        event : eventId
      }, utils.p(res, rej));
    });

    var markEventsRemovedPromise = new RSVP.Promise(function (res, rej) {
      db.events.update({
          _id : eventId
        }, {
          $set : { 
            dead : true 
          }
        }, utils.p(res, rej));
    });

    return removeMessagesPromise
    .then(markEventsRemovedPromise);
  }

  var setEventTitle = function (eventId, title) {
    return new RSVP.Promise(function (res, rej) {
      db.events.update({
          _id : eventId
        }, {
          $set : { 
            title : title 
          }
        }, utils.p(res, rej));
    });
  }

  exports.events = {
    create         : createEvent,
    get            : getEvents,
    remove         : removeEvent,
    getWithCreator : getEventsWithCreatorId,
    setTitle : setEventTitle
  };

  /********************* Messages *****************************/


  var setMessage = function (message, eventId, recipId) {
    var messageDoc = {
      message   : message,
      event     : mongojs.ObjectId(eventId),
      date      : new Date()
    }
    if (recipId) {
      messageDoc.recipient = recipId
    };
    
    return new RSVP.Promise(function (res, rej) {
      db.messages.insert(messageDoc, utils.p(res, rej));
    });
  }

  var getMessages = function (eventId, recipientId) {
    var query = { event : mongojs.ObjectId(eventId) };
    if (recipientId) {
      query.recipient = recipientId;
    };

    return new RSVP.Promise(function (res, rej) {
      db.messages.find(query).sort({ date : 1 }, utils.p(res, rej));
    });
  }

  exports.messages = {
    create : setMessage,
    get    : getMessages, 
  }

  /********************* Recipient *****************************/

  var getRecipient = function (eventId, recipPhone) {
    var query = { event : mongojs.ObjectId(eventId) };
    if (recipPhone) {
      query.phone = recipPhone;
    };

    return new RSVP.Promise(function (res, rej) {
      db.recipients.find(query, utils.p(res, rej, false, true /* Ensure nonEmpty */));
    });
  }

  var setRecipientStatus = function (recipId, status) {
    var query = { _id : recipId };

    return new RSVP.Promise(function (res, rej) {
      db.recipients.findAndModify({
        query  : query,
        update : {
          $set : {
            status : status
          }
        },
        new: true
      }, utils.p(res, rej));
    });
  }

  exports.recipients = {
    get       : getRecipient,
    setStatus : setRecipientStatus
  }

  exports.id = mongojs.ObjectId;

  module.exports = exports;

})();
