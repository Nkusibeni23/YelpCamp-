const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
  email: {
    type: String,
    required: true, // Set this to true to make the field required
    unique: true,
  },
});

userSchema.plugin(passportLocalMongoose);
module.exports = User = mongoose.model("User", userSchema);
