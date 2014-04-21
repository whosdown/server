(function () {
  var mongojs   = require('mongojs')
  ,   mongoKeys = require('./logins').mongo
  ,   RSVP      = require('rsvp')
  ,   _         = require('underscore');
  _.str         = require('underscore.string');
  _.mixin(_.str.exports());

  /*
   * Call a Node-style async function and return a promise.
   *
   * @param {function} fn A function that accepts a Node-style callback.
   * @param {...*} var_args A variable number of arguments to pass to the Node
   *         function.
   * @return {Promise}
   */
  RSVP.q = function(fn) {
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

  var consts = {
    duplicate: 11000
  }

  var db = mongojs(mongoKeys.url, ['users', 'events', 'recipients', 'messages']);

  var exports = {};

  /********************* Users *****************************/


  var createUser = function (user, cb) {
    user['isVerified'] = false;
    user['code'] = Math.floor(Math.random() * Math.pow(10,10));

    db.users.findAndModify({
      query: { 
        phone : user.phone 
      },
      update: user,
      upsert: true,
      new: true
    }, cb);
  };

  var verifyUser = function (userId, code, cb) {
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
    }, cb);
  };

  var getUser = function (userId, cb) {
    RSVP.q(db.users.find, { _id : mongojs.ObjectId(userId) })
        .then(function (users) {
            cb(null, users[0]);
          },  function (err) {
            cb(err);
        })
  };

  exports.users = {
    verify : verifyUser,
    create : createUser,
    get    : getUser
  };

  /********************* Events *****************************/

  var getEvents = function (creatorId, cb) {
    RSVP.q(db.events.find({ creator : creatorId }).sort, { expirDate : -1 })
        .then(function (events) {
            var eventIds = _.map(events, function (event) {
              return event._id;
            });

            return RSVP.hash(
              events : events,
              recips : RSVP.q(db.recipients.find, { event : { $in: eventIds } })
            )
          })
        .then(function (results) {
            var eventsWithPeople = _.map(results.events, function (event) {
              event.people = _.filter(results.recips, function (recip) {
                return _.isEqual(recip.event, event._id);
              });

              return event;
            });

            cb(null, eventsWithPeople);
          })
        .catch(function (err) {
          cb(err);
        });
  }

  var createEvent = function (eventData, cb) {
    var dayInMS = 86400000;
    var TenDaysInMS = dayInMS * 10;

    RSVP.q(db.events.insert, {
            creator: eventData.userId,
            message: eventData.message,
            title: eventData.title,
            phone: eventData.phone,
            expirDate: new Date(new Date().getTime() + TenDaysInMS)
          })
        .then(function (newEvent) {
            var recipients = _.map(eventData.recips, function (recipient) {
              return recipient.event = newEvent._id;
            });

            return RSVP.hash({
              newEvent : newEvent,
              recips   : RSVP.q(db.recipients.insert, recipients)
            });
          })
        .then(function (results) {
            cb(null, {
              eventId    : results.newEvent._id,
              eventPhone : results.newEvent.phone
            });
          })
        .catch(function (err) {
          cb(err);
        });
  };

  var setEventTitle = function (eventId, title, cb) {
    db.events.update({
      _id : eventId
    }, {
      $set : { 
        title : title 
      }
    }, cb);
  }

  exports.events = {
    create   : createEvent,
    get      : getEvents,
    setTitle : setEventTitle
  };

  /********************* Messages *****************************/


  var setMessage = function (message, recipId, eventId, cb) {
    db.messages.insert({
      message   : message,
      recipient : recipId,
      event     : mongojs.ObjectId(eventId),
      date      : new Date()
    }, cb);
  }

  var getMessages = function (eventId, cb) {
    db.messages.find({
      event : mongojs.ObjectId(eventId)
    }).sort({ 
      date : 1 
    }, cb);
  }

  exports.messages : {
    create : setMessage,
    get    : getMessages, 
  }

  /********************* Recipient *****************************/

  var getRecipient = function (eventId, recipPhone, cb) {
    RSVP.q(db.recipients.find, {
            event : mongojs.ObjectId(eventId),
            phone : recipPhone
          })
        .then(function (users) {
            cb(null, users[0]);
          },  function (err) {
            cb(err);
        });
  }

  var exports.recipient = {
    get : getRecipient
  }

  module.exports = exports;

})();
