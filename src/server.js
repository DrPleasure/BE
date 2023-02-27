import express from "express";
import listEndpoints from "express-list-endpoints";
import cors from "cors";

import eventsRouter from "./api/events/index.js";
import usersRouter from "./api/users/index.js";

import {
  badRequestHandler,
  genericServerErrorHandler,
  notFoundHandler,
  unauthorizedHandler,
} from "./errorHandlers.js";

import mongoose from "mongoose";



const server = express();
const port = process.env.PORT || 3001;





server.use(cors());
server.use(express.json());


server.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  next()
})




server.use("/users", usersRouter)
server.use("/events", eventsRouter)


server.use(badRequestHandler);
server.use(unauthorizedHandler);
server.use(notFoundHandler);
server.use(genericServerErrorHandler);

mongoose.connect(process.env.MONGO_URL);

mongoose.connection.on("connected", () => {
  console.log("Successfully connected to Mongo!");
  server.listen(port, () => {
    console.table(listEndpoints(server));
    console.log(`Server is running on port ${port}`);
  });
});
