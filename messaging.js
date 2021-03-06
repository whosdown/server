(function () {
  var fs      = require('fs')
  ,   t_keys  = require('./logins').twilio
  ,   RSVP    = require('rsvp')
  ,   _       = require('underscore');

  var p = function (resolve, reject, index) {
    return function (err, docs) {
      if (err) {
        reject(err);
      } else {
        resolve(index ? docs[index] : docs);
      }
    };
  }

  var twilio = require('twilio')(t_keys.account_id, t_keys.auth_token);

  var sendMessage = function(message) {
    console.log(message);
    return new RSVP.Promise(function (res, rej) {
      res(message);
      twilio.messages.create(message, p(res, rej));
    });
  }

  var sendMessages = function(messages) {
    return RSVP.all(
      _(messages).flatten().map(function (message) {
        return sendMessage(message);
      })
    );
  }

  var officialNumber = "+13475805352";
  var testPhone = {
    number : "+17313261704",
    sid    : "PN0446ee64d632d1f756a06f260b1144d1"
  };
  var numberSidMap = {
    "+17313261704" : testPhone.sid
  };

  var setReplyUrl = function (phone, smsUrl) {
    return new RSVP.Promise(function (res, rej) {
      twilio.incomingPhoneNumbers(numberSidMap[phone]).update({
        smsUrl    : smsUrl,
        smsMethod : 'POST'
      }, p(res, rej));
    });
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
