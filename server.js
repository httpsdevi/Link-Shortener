require('dotenv').config();
const mongoose = require('mongoose');

// Access MongoDB URI from the .env file
const mongoURI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Error connecting to MongoDB:", err));

const express = require('express');
const app = express();

// Serve static files

app.use(express.static(__dirname));

