(function () {
  module.exports = {
    p : function (resolve, reject, index, shouldBeNonEmpty) {
      return function (err, docs) {
        var nonEmptyCheck = shouldBeNonEmpty ? !docs[0] : false;
        if (err || !docs || nonEmptyCheck) {
          reject(err);
        } else {
          resolve(index ? docs[0] : docs);
        }
      };
    }
  }
})();
