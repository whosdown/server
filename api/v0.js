(function () {
  var resp     = require('../response').resp
  ,   message  = require('../messaging')
  ,   database = require('../database');

  // POST /event
  // crtr = creator id, msg = event message
  var create_event = function(req, res) {
    var q = req.query;
    if (!q.crtr || !q.msg) {
      resp.error(res, resp.BAD);
      return;
    }
    var out = {
      creator: q.crtr,
      message: q.msg
    };
    message.send_message(q.crtr, q.msg);
    resp.success(res, out);
  }

  // GET /event
  var get_events = function(req, res) {
    var q = req.query;
    if (!q.crtr || !q.evid) {
      resp.error(res, resp.BAD);
      return;
    }
    var out = {
      creator: q.crtr,
      event_id: q.evid
    };
    resp.success(res, out);
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
  var post_user = function (req, res) {
    var out = req.body.user;


    resp.success(res, out);
  }

  var get_user = function (req, res) {
    
  }

  module.exports = {
    events: {
      path: '/api/v0/event', 
      create: create_event,
      get_all: get_events,
      get_recipients: get_event_recipients
    },
    user: {
      path: '/api/v0/user',
      post: post_user,
      get:  get_user
    }
  };

})();
