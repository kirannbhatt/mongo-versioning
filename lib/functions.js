"use strict";

module.exports.cloneSchema = function (schema) {
  var Schema = schema.constructor;

  var clonedSchema = new Schema();
  schema.eachPath(function (key, path) {
    var clonedPath = {};

    clonedPath[key] = path.options;
    clonedPath[key].unique = false;

    clonedSchema.add(clonedPath);
  });

  return clonedSchema;
};

module.exports.setSchemaOptions = function (schema, options) {
  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      schema.set(key, options[key]);
    }
  }
};

module.exports.setProperty = function (obj, key, value) {
  obj[key] = value;
  return obj;
};

module.exports.extend = function (dest /*, source...*/) {
  var sources = Array.prototype.slice.call(arguments, 1);
  for (var i = 0, ii = sources.length; i < ii; i++) {
    var source = sources[i];
    for (var k in source) dest[k] = source[k];
  }
  return dest;
};

module.exports.clone = function (source) {
  return JSON.parse(JSON.stringify(source));
};
