(function () {
  var fs     = require('fs');
  var logins = fs.existsSync('./private') ? require('./private/logins') : process.env;

  module.exports = {
    mongo : {
      url: logins.MONGO_URL
    },
    twilio : {
      account_id: logins.TWILIO_ACCOUNT_ID,
      auth_token: logins.TWILIO_AUTH_TOKEN
    },
    maluuba : {
      url    : 'http://napi.maluuba.com/v0/interpret',
      apikey : logins.MALUUBA_API_KEY
    },
    tp : {
      url : 'http://text-processing.com/api/sentiment/'
    }
  }
})();