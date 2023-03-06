import express from "express";
import eventModel from "./model.js"
import { JWTAuthMiddleware } from "../../lib/jwtAuth.js";
import q2m from "query-to-mongo";
import createHttpError from "http-errors";
import mongoose from "mongoose";



const eventsRouter = express.Router();

// Middleware function to get an event by ID
const getEvent = async (req, res, next) => {
    const { id } = req.params;
  
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }
  
    try {
      const event = await eventModel.findOne({ _id: id });
  
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
  
      res.event = event;
      next();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
  
 

// GET all events
// GET all events
eventsRouter.get('/', async (req, res, next) => {
    try {
      const query = {};
      if (req.query.category) {
        query.category = req.query.category;
      }
      if (req.query.day) {
        // get events that match the day, using the start and end of the day
        const day = new Date(req.query.day);
        const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
        const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
        query.date = { $gte: startOfDay, $lte: endOfDay };
      }
      const events = await eventModel.find(query).populate({ path: 'createdBy', select: 'firstName lastName' }).populate({ path: 'attendees', select: 'firstName lastName avatar' });
      res.json(events);
    } catch (err) {
      next(createHttpError(500, err.message));
    }
  });
  
  

// GET a single event by ID
eventsRouter.get('/:id', JWTAuthMiddleware, getEvent, async (req, res) => {
    try {
      res.json(res.event);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  

// CREATE a new event
eventsRouter.post('/', JWTAuthMiddleware, async (req, res) => {
    const event = new eventModel({
      title: req.body.title,
      category: req.body.category,
      image: req.body.image,
      description: req.body.description,
      date: req.body.date,
      location: req.body.location,
      createdBy: req.user._id,
      createdByName: `${req.user.firstName} ${req.user.lastName}`,
      minPlayers: req.body.minPlayers,
      maxPlayers: req.body.maxPlayers,
      attendees: [],
      comments: []
    });
  
    // Use the Google Maps Geocoding API to get the latitude and longitude for the location
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(req.body.location)}&key=${process.env.GOOGLE_KEY}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.results.length > 0) {
        event.latitude = data.results[0].geometry.location.lat;
        event.longitude = data.results[0].geometry.location.lng;
      }
    } catch (err) {
      console.error(err);
    }
  
    try {
      const newEvent = await event.save();
      res.status(201).json(newEvent);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });
  

// UPDATE an event by ID
eventsRouter.put('/:id', JWTAuthMiddleware, async (req, res) => {
    try {
      const updatedEvent = await eventModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      res.json(updatedEvent);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });
  
  
// DELETE an event by ID
eventsRouter.delete('/:id', JWTAuthMiddleware, getEvent, async (req, res) => {
  try {
    await res.eventModel.remove();
    res.json({ message: 'Deleted event' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


eventsRouter.get('/locations/map', async (req, res, next) => {
    try {
      const locations = await eventModel.aggregate([
        { $group: { _id: "$location", longitude: { $first: "$longitude" }, latitude: { $first: "$latitude" } } },
        { $project: { _id: 0, location: "$_id", longitude: 1, latitude: 1 } },
      ]);
      res.json(locations);
    } catch (err) {
      next(createHttpError(500, err.message));
    }
  });
  
  

export default eventsRouter