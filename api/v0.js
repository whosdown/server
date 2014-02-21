(function () {
  var resp     = require('../response').resp
  ,   message  = require('../messaging')
  ,   database = require('../database');

  /*  POST /event
   *
   * @param req.body = {
              userId  : "52f8359d4cace484d3000004",
              message : "Who's Down for _____",
              recips  :  [
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

    if (!req.query.user) {
      resp.error(res, resp.BAD);
      return;
    }

    database.getEventsForCreator(req.query.user, success, failure);
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
  var postUser = function (req, res) {
    var failure = function (err) {
      resp.error(res, resp.CONFLICT, err);
    }

    var success = function (out) {
      resp.success(res, out);

      var verifyMessage = message.createMessage(out.phone, "address with verify link");

      message.sendMessage(verifyMessage);
    }

    database.createUser(req.body.user, success, failure);
    
  }

  module.exports = {
    events: {
      path: '/api/v0/event', 
      create: createEvent,
      getAll: getEvents
    },
    user: {
      path: '/api/v0/user',
      post: postUser
    }
  };

})();
