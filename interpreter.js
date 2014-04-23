(function () {
  var request = require('request')
  ,   maluuba = require('./logins').maluuba
  ,   tp      = require('./logins').tp
  ,   RSVP    = require('rsvp')
  ,   _       = require('underscore');

  var requestPromise = function (options) {
    return new RSVP.Promise(function (resolve, reject) {
      request(options, function (err, resp, body) {
        if (!err && resp.statusCode == 200) {
          resolve(JSON.parse(body));
        } else {
          console.log('Request failed' + body);
          reject(err);
        }
      });     
    });
  }

  var getTitleForMessage = function (message) {
    var maluubaOptions = {
      url    : maluuba.url,
      method : 'GET',
      qs     : {
        apikey : maluuba.apikey,
        phrase : message
      }
    };

    return requestPromise(maluubaOptions)
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

  var getSentiment = function (message) {
    var tpOptions = {
      url    : tp.url,
      method : 'POST',
      form   : {
        text : message
      }
    };

    var isPos = function (sent) {
      return sent === 'pos';
    }

    var isNeg = function (sent) {
      return sent === 'neg';
    }

    var isNeu = function (sent) {
      return sent === 'neutral';
    }

    var words = message.split(' ');
    var containsNot = _.contains(words, 'not');

    var heuristic = {
      down : function (choice, prob) {
        if(_.contains(words,'down')) {

        }
      }
    }


    return requestPromise(tpOptions)
    .then(function (analysis) {
      var choice = analysis.label;

      if (isPos(choice)) {
        return 1;
      }

      if (isNeu(choice)) {
        return 0;
      };

      if (isNeg(choice)) {
        return -1;
      };
    })
  }

  module.exports = {
    getSentiment       : getSentiment,
    getTitleForMessage : getTitleForMessage
  }

})();