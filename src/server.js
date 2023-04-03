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

// Set up CORS to allow requests from the frontend domain
const corsOptions = {
  origin: "https://capstone-fe-drpleasure.vercel.app", // Replace this with your frontend domain
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
server.use(cors(corsOptions));

server.use(express.json());

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
