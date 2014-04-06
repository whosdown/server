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
      apiKey : logins.MALUUBA_API_KEY
    }
  }
})();