const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema } = require("./schema.js");
const Review = require("./models/review.js");

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/wanderlust');
}
main()
    .then(() => {
        console.log("Connected to DB");
    })
    .catch((err) => {
        console.log(err);
    });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

app.get("/", (req, res) => {
    res.send("HELLO IM JOD");
});

app.get("/testListing", wrapAsync(async (req, res) => {
    let sampleListing = new Listing({
        title: "My new Villa",
        description: "by the beach",
        price: 1200000000000,
        location: "Calanguate , Goa",
        country: "India",
    });
    await sampleListing.save();
    console.log("Sample saved");
    res.send("Successful");
}));

app.listen("8080", (req, res) => {
    console.log("Listening to port");
});

app.get("/listings", wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
}));

const validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        let errorMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errorMsg);
    } else {
        next();
    }
};

const validateReview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);
    if (error) {
        let errorMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errorMsg);
    } else {
        next();
    }
};

app.get("/listings/new", (req, res) => {
    res.render("listings/new.ejs");
});

app.get("/listings/:id", wrapAsync(async (req, res) => {
    try {
        let { id } = req.params;
        const listing = await Listing.findById(id).populate('reviews');
        if (!listing) {
            throw new ExpressError(404, "Listing not found");
        }
        console.log("Listing with reviews:", listing); // Log listing with reviews
        res.render("listings/show.ejs", { listing });
    } catch (err) {
        console.error("Error fetching listing:", err); // Log error
        next(err); // Pass error to error handler
    }
}));

app.post("/listings",
    validateListing,
    wrapAsync(async (req, res, next) => {
        const newListing = new Listing(req.body.listing);
        await newListing.save();
        res.redirect("/listings");
    })
);

app.get("/listings/:id/edit", wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    console.log("Editing listing:", listing); // Log listing being edited
    res.render("listings/edit.ejs", { listing });
}));

app.put("/listings/:id", validateListing, wrapAsync(async (req, res) => {
    let { id } = req.params;
    console.log("Edit data received:", req.body.listing); // Log edit data
    const listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { new: true, runValidators: true });
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    console.log("Updated listing:", listing); // Log updated listing
    res.redirect(`/listings/${listing._id}`);
}));

app.delete("/listings/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    let deleted = await Listing.findByIdAndDelete(id);
    console.log(deleted);
    res.redirect(`/listings`);
}));

app.post("/listings/:id/reviews", validateReview, wrapAsync(async (req, res) => {
    try {
        console.log("Review data received:", req.body.review); // Log review data
        let listing = await Listing.findById(req.params.id);
        if (!listing) {
            throw new ExpressError(404, "Listing not found");
        }

        let newReview = new Review(req.body.review);
        await newReview.validate(); // Validate review data

        listing.reviews.push(newReview);

        await newReview.save();
        await listing.save();

        console.log("New review added:", newReview); // Log saved review
        console.log("Updated listing with reviews:", listing); // Log updated listing
        res.redirect(`/listings/${listing._id}`);
    } catch (err) {
        console.error("Error adding review:", err); // Log error
        next(err); // Pass error to error handler
    }
}));

app.delete("/listings/:id/reviews/:reviewId", wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);

    res.redirect(`/listings/${id}`);
}));

app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page not found"));
});

app.use((err, req, res, next) => {
    const { statuscode = 500, message = "Something went wrong" } = err;
    console.error(err); // Log the error details
    res.status(statuscode).render("./listings/error.ejs", { err });
});
