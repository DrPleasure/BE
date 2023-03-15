import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  text: { type: String, required: false },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: false },
  childComments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: false }]
});


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
  latitude: {
    type: Number,
    required: false
  },
  longitude: {
    type: Number,
    required: false
  },
  minPlayers: {
    type: Number,
    required: false
  },
  maxPlayers: {
    type: Number,
    required: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comments: [commentSchema],
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: [],
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
const commentModel = mongoose.model('Comment', commentSchema);

export default {
  eventModel,
  commentModel
};
