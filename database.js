(function () {
  var mongojs   = require('mongojs')
  ,   RSVP      = require('rsvp')
  ,   _         = require('underscore')
  ,   _str      = require('underscore.string');
  _.mixin(_str.exports());

  var mongoKeys = require('./logins').mongo
  ,   utils     = require('./utils');

  var consts = {
    duplicate: 11000
  }

  function db (collection, method, projectors, shouldBeNonEmpty) {
    var database = mongojs(mongoKeys.url);
    var connection = database.collection( collection );

    return function executePromise (argument) {
      var executeArgs = _.toArray(arguments);

      return new RSVP.Promise(function (res, rej) {
        var callback = utils.p(res, rej, false, shouldBeNonEmpty);

        if (projectors && _.size(projectors) > 0) {
          var cursor = connection[ method ].apply(connection, executeArgs);
          var withProjectors = _.reduce(projectors, function (memo, value, key) {
            return memo[ key ](value);
          }, cursor);

          withProjectors.toArray(callback);
        } else {
          executeArgs.push(callback);
          connection[ method ].apply(connection, executeArgs);
        }


      });
    }
  }



  // **************************************************
  // Users
  // **************************************************

  var usersPromise_findAndModify = db('users', 'findAndModify');

  var _users = {

    create: function (user) {

      user['isVerified'] = false;
      user['code']       = Math.floor(Math.random() * Math.pow(10,10));

      return usersPromise_findAndModify({
        query  : { phone : user.phone },
        update : user,
        upsert : true,
        new    : true
      });
    },

    verify: function (userId, code) {
      return usersPromise_findAndModify({
        query  : {
          _id  : mongojs.ObjectId(userId),
          code : parseInt(code)
        }, 
        update : {
          $set   : { isVerified : true },
          $unset : { code       : ''   } 
        },
        new    : true
      });
    },

    get: function (userId) {
      return db('users', 'find')({ 
        _id : mongojs.ObjectId(userId) 
      });
    }
  };

  // **************************************************
  // Events
  // **************************************************

  var _events = {

    // @param   eventData must have the properties: [ userId, message, title, phone, recips ]
    create: function (eventData) {
      var dayInMS = 86400000;
      var TenDaysInMS = dayInMS * 10;

      var addEvents = db('events', 'insert')({
        creator   : eventData.userId,
        message   : eventData.message,
        title     : eventData.title,
        phone     : eventData.phone,
        expirDate : new Date(new Date().getTime() + TenDaysInMS)
      });

      var addRecipientsForEvent = function (event) {
        var recipients = _.map(eventData.recips, function (recipient) {
            recipient.event = event._id;
            return recipient;
          });

        return RSVP.hash({
          event  : event, 
          recips : db('recipients', 'insert')(recipients)
        });
      }

      return addEvents
        .then(addRecipientsForEvent)
        .then(function (entries) {
          return {
            eventId    : entries.event._id,
            eventPhone : entries.event.phone
          };
        });
    },

    get: function (eventId) {
      return db('events', 'find')({ 
        _id  : mongojs.ObjectId(eventId),
        dead : { $exists: false }
      });
    },

    remove: function (eventId) {
      var removeMessages = db('messages', 'remove')({
        event : eventId
      });

      var markEventRemoved = db('events', 'update')({
          _id : eventId
        }, {
          $set : { 
            dead : true 
          }
      });

      return removeMessages
        .then(markEventRemoved);
    },

    getWithCreator: function (creatorId) {
      var getEvents = db('events', 'find', { sort : { expirDate : -1 } })({ 
        creator : creatorId,
        dead    : { $exists: false }
      });

      var getRecipsForEvents = function (events) {
        return db('recipients', 'find')({ 
          event : { 
            $in: _.pluck(events, '_id') 
          } 
        });
      }
      
      // Expects an object with events and recips proporties
      var projectEventsWithRecips = function (params) {
        return _.map(params.events, function (event) {
          event.people = _.filter(params.recips, function (recip) {
            return _.isEqual(recip.event, event._id);
          });

          return event;
        });
      }

      return getEvents
        .then(function (events) {
          return RSVP.hash({
            events : events,
            recips : getRecipsForEvents(events)
          })
        })
        .then(projectEventsWithRecips);
    },

    setTitle: function (eventId, title) {
      return db('events', 'update')({
        _id : eventId
      }, {
        $set : { 
          title : title 
        }
      });
    }
  };

  // **************************************************
  // Messages
  // **************************************************

  var _messages = {

    create: function (message, eventId, recipId) {
      var messageDoc = {
        message   : message,
        event     : mongojs.ObjectId(eventId),
        date      : new Date()
      }
      if (recipId) {
        messageDoc.recipient = recipId
      };
      
      return db('messages', 'insert')(messageDoc);
    },

    get: function (eventId, recipientId) {
      var query = { event : mongojs.ObjectId(eventId) };
      if (recipientId) {
        query.recipient = recipientId;
      };

      return db('messages', 'find', { sort : { date : 1 } })(query);
    }, 
  }

  // **************************************************
  // Recipients
  // **************************************************

  var _recipients = {

    get: function (eventId, recipPhone) {
      var query = { event : mongojs.ObjectId(eventId) };
      if (recipPhone) {
        query.phone = recipPhone;
      };

      return db('recipients', 'find', {}, true /* Ensure nonEmpty */)(query);
    },

    getWithCreator : function (creatorId) {
      var findEvents = db('events', 'find', { sort : { expirDate : -1 } });

      return findEvents({ creator : creatorId })
        .then(function (events) {
          return RSVP.all(_.map(events, function (event) {
            return RSVP.hash({
              title   : event.title,
              message : event.message,
              people  : db('recipients', 'find')({ event : event._id })
            });
          }));
        })
    },

    setStatus: function (recipId, status) {
      return db('recipients', 'findAndModify')({
        query  : { 
          _id : recipId 
        },
        update : {
          $set : {
            status : status
          }
        },
        new: true
      });
    }
  }


  module.exports = {
    users      : _users,
    events     : _events,
    messages   : _messages,
    recipients : _recipients,

    id         : mongojs.ObjectId
  };

})();
