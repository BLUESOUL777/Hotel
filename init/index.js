const mongoose = require("mongoose"); // Import mongoose for MongoDB connection
const initData = require("./data.js"); // Import initial data to be inserted into the database
const Listing = require("../models/listing.js"); // Import the Listing model

// Main function to connect to the MongoDB database
async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/wanderlust'); // Connect to the MongoDB database named 'wanderlust'
}

// Call the main function and handle the promise
main()
    .then(() => {
        console.log("Connected to DB"); // Log success message if connected to the database
        initDB(); // Initialize the database with data
    })
    .catch((err) => {
        console.log(err); // Log error message if there is an error connecting to the database
    });

// Function to initialize the database with data
const initDB = async () => {
    await Listing.deleteMany({}); // Delete all existing documents in the Listing collection
    await Listing.insertMany(initData.data); // Insert initial data into the Listing collection
    console.log("data was initialized"); // Log success message after data is initialized
}