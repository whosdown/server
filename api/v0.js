(function () {
  var resp     = require('../response').resp
  ,   message  = require('../messaging')
  ,   database = require('../database');

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
      recips: req.body.people
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

    database.getEventsForCreator(req.query.userId, success, failure);
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

      var verifyUrl = "wd://verify?" + out.code;
      var verifyMessage = message.createMessage(out.phone, verifyUrl);

      message.sendMessage(verifyMessage);
    }

    database.updateOrCreateUser(req.body.user, success, failure);
    
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

    database.verifyUser(req.body.userId, req.body.code, success, failure);
  }

  // database.verifyUser('533880df7de014ee20f42b01', 9438007790, function (docs) {
  //   console.log(docs);
  // }, function (docs) {
  //   console.log(docs);
  // });

  module.exports = {
    events: {
      path: '/api/v0/event', 
      create: createEvent,
      getAll: getEvents
    },
    user: {
      path: '/api/v0/user',
      post: postUser,
      verifyPath: '/api/v0/verify',
      verify: verifyUser
    }
  };

})();
