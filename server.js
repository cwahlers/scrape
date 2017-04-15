//MONGODB_URI: mongodb://heroku_sf716p4j:3tnrvfduaadugdb7eefb6760a6@ds161580.mlab.com:61580/heroku_sf716p4j
// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
// Requiring our Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));

// Make public a static dir
app.use(express.static("public"));

// Database configuration with mongoose
//mongoose.connect("mongodb://localhost/hw18scrape");
// mongoose.connect("mongodb://heroku_sf716p4j:3tnrvfduaadugdb7eefb6760a6@ds161580.mlab.com:61580/heroku_sf716p4j");
//mongoose.connect("mongodb://admin:admin@ds161640.mlab.com:61640/hw18scrape");



var db = process.env.MONGODB_URI || "mongodb://localhost/hw18scrape";
mongoose.connect(db, function(error){
  if (error) {
    console.log(error)
  } else {
    console.log("success connect to DB")
  }
})

// Show any mongoose errors
// db.on("error", function(error) {
//   console.log("Mongoose Error: ", error);
// });

// Once logged in to the db through mongoose, log a success message
// db.once("open", function() {
//   console.log("Mongoose connection successful.");
// });


// Routes
// ======

// A GET request to scrape the tesla website
app.get("/scrape", function(req, res) {
  // First, grab the body of the html with request forums.tesla.com/forum/tesla-model-s
  request("https://forums.tesla.com/forum/tesla-model-s", function(error, response, html) {
     // load into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(html);
  
    $("tr td").each(function(i, element) {
      // Save an empty result object
      var result = {};
      //console.log($(this));
      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this).children("a").text();
      result.link = $(this).children("a").attr("href");

      var entry = new Article(result);

      // save that entry to the db
      entry.save(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        // Or log the doc
        else {
          console.log(doc);
        }
      });

    });
  });
  // Tell the browser that we finished scraping the text
  res.send("Scrape Complete");
});

// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
  // Grab every doc in the Articles array
  Article.find({}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});

// Grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  Article.findOne({ "_id": req.params.id })
  // ..and populate all of the notes associated with it
  .populate("note")
  // now, execute our query
  .exec(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise, send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});


// Create a new note or replace an existing note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  var newNote = new Note(req.body);

  // And save the new note the db
  newNote.save(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
      // Use the article id to find and update it's note
      Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);
        }
      });
    }
  });
});


// Listen on port 3000
app.listen(PORT, function() {
  console.log("App running!");
});
