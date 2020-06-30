"use strict";

var functions = require("./functions"),
  extend = functions.extend,
  setProperty = functions.setProperty,
  clone = functions.clone,
  cloneSchema = functions.cloneSchema;

var defaultOptions = {
  versionProperty: "_v",
  modelName: function (name) {
    return name + "_version";
  },
  checkVersion: true,
  trackDates: true,
  createdProperty: "_created",
  modifiedProperty: "_modified",
};

module.exports = function (schema, options) {
  var Schema = schema.constructor,
    ObjectId = Schema.Types.ObjectId;

  options = extend({}, defaultOptions, options);

  // maunally update the versionKey
  schema.set("versionKey", false);
  schema.add(
    setProperty({}, options.versionProperty, { type: Number, default: 0 })
  );

  if (options.trackDates) {
    schema.add(
      setProperty({}, options.createdProperty, {
        type: Date,
        default: Date.now,
      })
    );
    schema.add(
      setProperty({}, options.modifiedProperty, {
        type: Date,
      })
    );
  }

  schema.on("init", function (model) {
    var versionedSchema = cloneSchema(schema);
    versionedSchema.add({
      _refId: {
        type: ObjectId, // reference to the object
        ref: model.modelName,
      },
      _action: {
        // reason of versioning
        type: String,
        enum: ["save", "remove"],
      },
    });

    var VersionModel = (model.VersionModel = model.db.model(
      options.modelName(model.modelName),
      versionedSchema
    ));

    model.prototype.__genVersion = function () {
      var bkp = clone(this);
      bkp._refId = this._id; // Sets origins document id as a reference
      delete bkp._id;

      var bkpDocument = new VersionModel(bkp);
      return bkpDocument;
    };
  });
  schema.pre("findOneAndUpdate", function () {
    const update = this.getUpdate();
    if (update.__v != null) {
      delete update.__v;
    }
    const keys = ["$set", "$setOnInsert"];
    for (const key of keys) {
      if (update[key] != null && update[key].__v != null) {
        delete update[key].__v;
        if (Object.keys(update[key]).length === 0) {
          delete update[key];
        }
      }
    }
    update.$inc = update.$inc || {};
    update.$inc.__v = 1;
  });

  schema.pre("save", function (next) {
    // TODO ignored fields
    var self = this;

    if (!options.checkVersion) return save();

    self.constructor.findOne({ _id: self._id }, function (err, current) {
      if (err) return next(err);

      if (current) {
        if (current[options.versionProperty] > self[options.versionProperty])
          next(new Error("Trying to submit older version!"));
        else save();
      } else {
        save();
      }
    });

    function save() {
      var bkpDocument = self.__genVersion();
      bkpDocument._action = "save";
      self[options.versionProperty]++;
      if (options.trackDates) self[options.modifiedProperty] = Date.now();
      bkpDocument.save(next);
    }
  });

  schema.pre("remove", function (next) {
    var bkpDocument = this.__genVersion();
    bkpDocument._action = "remove";
    this[options.versionProperty]++;
    bkpDocument.save(next);
  });
};
