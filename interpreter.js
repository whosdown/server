(function () {
  var request = require('request')
  ,   maluuba = require('./logins').maluuba
  ,   _       = require('underscore');

  var options = {
    url    : maluuba.url,
    method : 'GET',
    qs     : {
      apikey : maluuba.apikey,
      phrase : 'Anyone want to get coffee tonight?'
    }
  };

  var mInterperet = function (phrase, cb) {
    var options = {
      url    : maluuba.url,
      method : 'GET',
      qs     : {
        apikey : maluuba.apikey,
        phrase : phrase
      }
    };
    request(options, function (err, resp, body) {
      if (!err && resp.statusCode == 200) {
        var info = JSON.parse(body);
        cb(null, info);
      } else {
        console.log(body);
        cb(err)
      }
    });
  }

  var getTitleForMessage = function (message, callback) {
    mInterperet(message, function (err, info) {
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
      callback(err, title);
    });
  }

  module.exports = {
    getTitleForMessage : getTitleForMessage
  }

})();