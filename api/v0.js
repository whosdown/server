(function () {
  var resp     = require('../response').resp
  ,   message  = require('../messaging')
  ,   database = require('../database');

  // POST /event
  // crtr = creator id, msg = event message
  var createEvent = function(req, res) {
    var failure = function (err) {
      if (err) {
        resp.error(res, resp.CONFLICT, err);
      } else {
        resp.error(res, resp.BAD);
      }
      return;
    }

    var success = function (out) {
      return resp.success(res, out);
    }

    database.createEvent({
      userId: req.body.userId,
      message: req.body.message,
      title: undefined,
      recips: req.body.recips
    }, success, failure);
  }

  // GET /event
  var getEvents = function(req, res) {
    var failure = function (err) {
      resp.error(res, resp.NOT_FOUND, err);
    }

    var success = function (out) {
      resp.success(res, out);
    }

    console.log(req.query);
    
    if (!req.query.user) {
      resp.error(res, resp.BAD);
      return;
    }

    database.getEventsForCreator(req.query.user, success, failure);
  }

  var get_event_recipients = function (req, res) {

  }


  /*
   *
   * @param req.body = 
        user[name]=tobi&
        user[phone]=1234567890
   *
   */
  var postUser = function (req, res) {
    var failure = function (err) {
      resp.error(res, resp.CONFLICT, err);
    }

    var success = function (out) {
      resp.success(res, out);
    }

    database.createUser(req.body.user, success, failure);
  }

  var get_user = function (req, res) {
    
  }

  module.exports = {
    events: {
      path: '/api/v0/event', 
      create: createEvent,
      getAll: getEvents,
      get_recipients: get_event_recipients
    },
    user: {
      path: '/api/v0/user',
      post: postUser,
      get:  get_user
    }
  };

})();
