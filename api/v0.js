
resp = require('../response').resp;
message = require('../messaging');

// POST /event
// crtr = creator id, msg = event message
exports.post_event = function(req, res) {
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
exports.get_event = function(req, res) {
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