exports.resp = {
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL: 500,
  BAD: 400,
  FORBIDDEN: 403,
  CONFLICT: 409,
  CREATED: 201,
  OK: 200,
  success: function(res, msg) {
    res.status(this.OK);
    return res.send({
      status: this.OK,
      data: msg
    });
  },
  error: function(res, code, msg) {
    if (msg) {
      return res.status(code).send({
        status: code,
        error: msg
      });
    } else {
      return res.send(code);
    }
  }
};