const http = require("http");
const express = require("express");
const session = require("express-session");
const path = require("path");
const Joi = require("joi");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const { campgroundSchema, reviewSchema } = require("./schemas.js");
const catchAsync = require("./utils/catchAsync");
const ExpressError = require("./utils/ExpressError");
const methodOverride = require("method-override");
const Review = require("./models/review");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const flash = require("connect-flash");
const { isLoggedIn } = require("./middleware.js");

const userRoutes = require("./routes/users");
const Campground = require("./models/campground.js");
const User = require("./models/user.js");
const campground = require("./models/campground");
const review = require("./models/review");

mongoose.connect("mongodb://localhost:27017/yelp-camp", {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false, // Add this line to suppress the warning
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open ", () => {
  console.log("Database connected");
});

const app = express();

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use(flash());

const sessionConfing = {
  secret: "keyone",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 36e5 * 48,
    maxAge: 36e5 * 48,
  },
};
app.use(session(sessionConfing));

app.use(passport.initialize());
app.use(
  session({
    secret: "notagoodsecret",
    resave: false,
    saveUninitialized: true,
  })
);
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Serve static files in production and development mode (if you're using a hosting service like Heroku)

function validateCampground(req, res, next) {
  const { error } = campgroundSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((detail) => detail.message).join(",");
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
}

const validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((detail) => detail.message).join(",");
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
};

app.use("/", userRoutes);

// app.get("/fakeUser", async (req, res) => {
//   const existingUser = await User.findOne({ username: "beni" });

//   if (existingUser) {
//     res.send("User with this username already exists.");
//   } else {
//     const user = new User({ email: "beni21@gmail.com", username: "beni" });
//     const newUser = await User.register(user, "chicken");
//     res.send(newUser);
//   }
// });

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/campgrounds", isLoggedIn, async (req, res) => {
  const campgrounds = await Campground.find({});
  res.render("campgrounds/index", { campgrounds });
});
app.get("/campgrounds/new", isLoggedIn, (req, res) => {
  res.render("campgrounds/new");
});

app.post(
  "/campgrounds",
  isLoggedIn,
  catchAsync(async (req, res, next) => {
    const campgroundSchema = Joi.object({
      title: Joi.string().required(),
      image: Joi.string().required(),
      price: Joi.number().required().min(0), // Use number() for price
    }).required();

    const { error } = campgroundSchema.validate(req.body);

    if (error) {
      const errorMessage = error.details.map((el) => el.message).join(", ");
      throw new ExpressError(errorMessage, 400);
    }

    // Continue with saving the campground
    const campground = new Campground(req.body.campground);
    await campground.save();
    res.redirect(`/campgrounds/${campground._id}`);
  })
);

app.get(
  "/campgrounds/:id",
  isLoggedIn,
  catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id).populate(
      "reviews"
    );
    // console.log(campground);
    res.render("campgrounds/show", { campground });
  })
);

app.get(
  "/campgrounds/:id/edit",
  isLoggedIn,
  catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id);
    res.render("campgrounds/edit", { campground });
  })
);

app.put(
  "/campgrounds/:id",
  isLoggedIn,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findByIdAndUpdate(id, {
      ...req.body.campground,
    });
    res.redirect(`/campgrounds/${campground._id}`);
  })
);

app.delete(
  "/campgrounds/:id",
  isLoggedIn,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    await Campground.findByIdAndDelete(id);
    res.redirect("/campgrounds");
  })
);

app.post(
  "/campgrounds/:id/reviews",
  validateReview,
  isLoggedIn,
  catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id);
    const review = new Review(req.body.review);
    campground.reviews.push(review);
    await review.save();
    await campground.save();
    // req.flash("Success", "You made new campground!");
    res.redirect(`/campgrounds/${campground._id}`);
  })
);

app.delete(
  "/campgrounds/:id/reviews/:reviewId",
  isLoggedIn,
  catchAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    await Campground.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/campgrounds/${id}`);
    // res.send("DELETE ME!!");
  })
);

app.all("*", (req, res, next) => {
  next(new ExpressError("Page Not Found", 404));
});

app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) err.message = "Oh Node, Something Went Wrong!";
  res.status(statusCode).render("error", { err });
  //   res.send("Ohh Boy, Something Went Wrong");
});

const port = 3005; // Change this to an available port number
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
