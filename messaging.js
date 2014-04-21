(function () {
  var fs      = require('fs')
  ,   t_keys  = require('./logins').twilio
  ,   _       = require('underscore');


  var twilio = require('twilio')(t_keys.account_id, t_keys.auth_token);

  // exports.send_message = function(recip, msg) {
  //   var message_info = {
  //     to: recip,
  //     from: "+13475805352",
  //     body: msg
  //   };

    // twilio.messages.create(message_info, function(err, message) {
    //   if (message) {
    //     console.log(message.sid);
    //   } else {
    //     console.log('message creation failed - ' + err);
    //   }
    // });
  // }

  var sendMessage = function(message) {
    console.log(message);
    twilio.messages.create(message, function(err, message) {
      if (message) {
        console.log(message.sid);
      } else {
        console.log('message creation failed - ' + err);
      }
    });
  }

  var sendMessages = function(messages) {
    _.each(_.flatten(messages), function (message) {
      sendMessage(message);
    })
  }

  var officialNumber = "+13475805352";
  var testPhone = {
    number : "+17313261704",
    sid    : "PN0446ee64d632d1f756a06f260b1144d1"
  };
  var numberSidMap = {
    "+17313261704" : testPhone.sid
  };

  var setReplyUrl = function (phone, smsUrl, succ) {
    twilio.incomingPhoneNumbers(numberSidMap[phone]).update({
      smsUrl    : smsUrl,
      smsMethod : 'POST'
    }, function (err, number) {
      if (!err) {
        succ(number);
      };
    })
  }

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
    sendMessage  : sendMessage,
    sendMessages : sendMessages,
    testPhone    : testPhone,
    createMessage: createMessage,

    setReplyUrl  : setReplyUrl
  }

})();
