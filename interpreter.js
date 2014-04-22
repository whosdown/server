(function () {
  var request = require('request')
  ,   maluuba = require('./logins').maluuba
  ,   RSVP    = require('rsvp')
  ,   _       = require('underscore');

  var options = {
    url    : maluuba.url,
    method : 'GET',
    qs     : {
      apikey : maluuba.apikey,
      phrase : 'Anyone want to get coffee tonight?'
    }
  };

  var mInterperet = function (phrase) {
    var options = {
      url    : maluuba.url,
      method : 'GET',
      qs     : {
        apikey : maluuba.apikey,
        phrase : phrase
      }
    };

    return new RSVP.Promise(function (resolve, reject) {
      request(options, function (err, resp, body) {
        if (!err && resp.statusCode == 200) {
          var info = JSON.parse(body);
          resolve(info);
        } else {
          console.log(body);
          reject(err);
        }
      });     
    });
  }

  var getTitleForMessage = function (message) {
    return mInterperet(message)
    .then(function (info) {
      var result = info.entities || {};
      var title = '';
      if (result.destination) {
        title += result.destination[0]; 
      }

      if (result.transittype) {
        title = result.transittype[0] + ' to ' + title; 
      }

      if (result.genre) {
        title = result.genre[0] + ' ' + title; 
      }

      title = (result.title ? result.title[0] : result.title) || 
              (result.searchterm ? result.searchterm[0] : result.searchterm) || 
              (title === '' ? _(message).prune(16) : title);

      title = _.rtrim(title, '?');
      title = _.capitalize(title);
      
      return title;
    });
  }

  module.exports = {
    getTitleForMessage : getTitleForMessage
  }

})();