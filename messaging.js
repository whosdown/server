(function () {
  var fs      = require('fs');
  var t_keys  = require('./logins').twilio;

  var client = require('twilio')(t_keys.account_id, t_keys.auth_token);

  // exports.send_message = function(recip, msg) {
  //   var message_info = {
  //     to: recip,
  //     from: "+13475805352",
  //     body: msg
  //   };

  //   client.messages.create(message_info, function(err, message) {
  //     if (message) {
  //       console.log(message.sid);
  //     } else {
  //       console.log('message creation failed - ' + err);
  //     }
  //   });
  // }

  var sendMessage = function(message) {
    console.log(message);
  }

  var officialNumber = "+13475805352";

  var createMessage = function (to, body, from) {
    return {
      to: to,
      body: body,
      from: from ? from : officialNumber
    }
  }

  module.exports = {
    /*
     * 
     *
     */
    sendMessage: sendMessage,

    createMessage: createMessage
  }

})();
