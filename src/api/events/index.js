import express from "express";
import models from "./model.js";
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

const { eventModel, commentModel } = models;

import { JWTAuthMiddleware } from "../../lib/jwtAuth.js";
import q2m from "query-to-mongo";
import createHttpError from "http-errors";
import mongoose from "mongoose";

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


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
      const events = await eventModel.find(query).populate({ path: 'createdBy', select: 'firstName lastName' }).populate({ path: 'attendees', select: 'firstName avatar' });
      res.json(events);
    } catch (err) {
      next(createHttpError(500, err.message));
    }
  });
  
  

// GET a single event by ID
eventsRouter.get('/:id', JWTAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: id }; 

    const event = await eventModel.findOne(query)
      .populate({ path: 'createdBy', select: 'firstName lastName avatar email' })
      .populate({ path: 'attendees', select: 'firstName avatar' })
      .populate({ path: 'comments.user', select: 'firstName lastName avatar' })
      .populate({
        path: 'comments.childComments',
        model: 'Comment', // Make sure to use the correct model name for your comments
        populate: {
          path: 'user',
          model: 'User', // Make sure to use the correct model name for your users
          select: 'firstName lastName avatar',
        },
      });

    res.json(event);
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
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(req.body.location)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
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
    await res.event.remove(); // Change this line to use 'res.event' instead of 'res.eventModel'
    res.json({ message: 'Deleted event' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Add an attendee to an event
eventsRouter.post("/:id/attend", JWTAuthMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
  
    try {
      const event = await eventModel.findById(id);
  
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
  
      // Check if the user is already attending the event
      const isAttending = event.attendees.some(
        (attendee) => attendee && attendee.toString() === userId
      );
      
      
      if (isAttending) {
        return res.status(400).json({ message: "User is already attending the event" });
      }
  
      // Add the user to the attendees array
      event.attendees.push(userId);
      await event.save();
  
      return res.status(200).json({ message: "User added to the attendees list" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server Error" });
    }
  });

  // DELETE /events/:id/attend
  eventsRouter.delete("/:id/attend", JWTAuthMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
  
    try {
      const updatedEvent = await eventModel.findOneAndUpdate(
        { _id: id },
        { $pull: { attendees: userId } },
        { new: true }
      );
  
      if (!updatedEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
  
      res.json(updatedEvent);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
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
  
  eventsRouter.post("/:id/comments", JWTAuthMiddleware, async (req, res) => {
    const { id } = req.params;
    const { comment, parentCommentId } = req.body;
    const userId = req.user._id;
  
    try {
      const event = await eventModel.findById(id).populate([
        {
          path: "comments.user",
          select: "firstName lastName avatar",
        },
        {
          path: "comments.childComments",
          model: "Comment",
          populate: {
            path: "user",
            model: "User",
            select: "firstName lastName avatar",
          },
        },
      ]);
  
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
  
      const newComment = { user: userId, text: comment, childComments: [] };
  
      if (parentCommentId) {
        // Find the parent comment
        const parentComment = event.comments.find((c) => c._id.toString() === parentCommentId);
  
        if (!parentComment) {
          return res.status(404).json({ message: "Parent comment not found" });
        }
  
        const childComment = new commentModel(newComment);
        await childComment.save();
  
        parentComment.childComments.push(childComment._id);
      } else {
        // If there's no parentCommentId, add the new comment to the event's comments array
        event.comments.push(newComment);
      }
  
      await event.save();
  
      return res.status(200).json(event.comments);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server Error" });
    }
  });
  
  
  
  eventsRouter.post("/send-email", async (req, res) => {
    try {
      console.log("Request body:", req.body);

      await sgMail.send(req.body);
      res.status(200).send("Email sent");
    } catch (error) {
      console.error("Error details:", error.response.body);
      res.status(500).send("Failed to send email");
    }
  });
  
  
  
  
  

export default eventsRouter