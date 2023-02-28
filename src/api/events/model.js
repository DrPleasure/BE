import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },  
  category: {
    type: String,
    required: true,
    enum: ["Football", "Badminton", "Tennis", "Padel", "Spikeball", "Basket"]
  },
  image: {
    type: String,
    required: false
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  minPlayers: {
    type: Number,
    required: true
  },
  maxPlayers: {
    type: Number,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: [],
    validate: {
      validator: function(value) {
        if (!Array.isArray(value) || value.includes(this.createdBy)) {
          return false;
        }
        return true;
      },
      message: 'The event creator cannot add themselves as an attendee'
    }
  }],
  
});

eventSchema.pre('save', function(next) {
  if (this.attendees.indexOf(this.createdBy) === -1) {
    this.attendees.push(this.createdBy);
  }
  next();
});

eventSchema.virtual('attendeesWithNames', {
  ref: 'User',
  localField: 'attendees',
  foreignField: '_id',
  justOne: false,
  select: 'firstName lastName'
});

const eventModel = mongoose.model('Event', eventSchema);

export default eventModel;
