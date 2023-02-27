import express from "express";
import createHttpError from "http-errors";
import userModel from "./model.js";
import q2m from "query-to-mongo";
import multer from "multer";
import { adminOnlyMiddleware } from "../../lib/adminOnly.js";
import { JWTAuthMiddleware } from "../../lib/jwtAuth.js";
import { createAccessToken } from "../../lib/tools.js";
import passport from "passport";

import { cloudinaryUpload } from "../../lib/upload.js";
const usersRouter = express.Router();

usersRouter.post("/register", async (req, res, next) => {
    try {
      const newUser = new userModel(req.body);
      const { _id, role } = await newUser.save();
      const payload = { _id: newUser._id, role: newUser.role };
      const accessToken = await createAccessToken(payload);
      res.send({ user: newUser, accessToken });
    } catch (error) {
      next(error);
    }
  });
  

usersRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);
    const user = await userModel.findByCredentials(email, password);
    if (user) {
      const payload = { _id: user._id, password: user.password };
      console.log(payload);
      const accessToken = await createAccessToken(payload);
      console.log(user);
      res.send({ accessToken, user });
    } else {
      next(createHttpError(401, "Bad credentials!"));
    }
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/me", JWTAuthMiddleware, async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user._id);
    if (user) {
      res.send(user);
    } else {
      next(
        createHttpError(404, `user with id ${req.user._id} does not exist!`)
      );
    }
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/:userId", async (req, res, next) => {
  try {
    const user = await userModel.findById(req.params.userId);
    if (user) {
      res.status(200).json(user);
    } else {
      next(
        createHttpError(
          404,
          `user with id ${req.params.userId} does not exist!`
        )
      );
    }
  } catch (error) {
    next(error);
  }
});

usersRouter.put("/me", JWTAuthMiddleware, async (req, res, next) => {
  try {
    const updatedUser = await userModel.findByIdAndUpdate(
      req.user._id,
      req.body,
      { new: true, runValidators: true }
    );
    if (updatedUser) {
      res.send(updatedUser);
    } else {
      next(
        createHttpError(404, `user with id ${req.user._id} does not exist!`)
      );
    }
  } catch (error) {
    next(error);
  }
});

usersRouter.delete("/me", JWTAuthMiddleware, async (req, res, next) => {
  try {
    const deletedUser = await userModel.findByIdAndDelete(req.user._id);
    if (deletedUser) {
      res.status(204).send();
    } else {
      next(
        createHttpError(404, `user with id ${req.user._id} does not exist!`)
      );
    }
  } catch (error) {
    next(error);
  }
});

usersRouter.post(
  "/me/avatar",
  JWTAuthMiddleware,
  cloudinaryUpload,
  async (req, res, next) => {
    try {
      //we get from req.body the picture we want to upload

      console.log("ID: ", req.user._id);
      const updatedUser = await userModel.findByIdAndUpdate(
        req.user._id,
        { avatar: req.file.path },
        { new: true, runValidators: true }
      );
      if (updatedUser) {
        res.status(204).send(updatedUser);
      } else {
        next(createHttpError(404, `User with id ${req.user._id} not found`));
      }
    } catch (error) {
      next(error);
    }
  }
);

usersRouter.get(
  "/",
  JWTAuthMiddleware,
  async (req, res, next) => {
    try {
      const mongoQuery = q2m(req.query);
      // Adding a filter on the firstName field to search for partial matches
      const regex = new RegExp(req.query.firstName, "i");
      mongoQuery.criteria.firstName = { $regex: regex };
      const total = await userModel.countDocuments(mongoQuery.criteria);
      const users = await userModel
        .find(mongoQuery.criteria, mongoQuery.options.fields)
        .limit(mongoQuery.options.limit)
        .skip(mongoQuery.options.skip)
        .sort(mongoQuery.options.sort);
      if (users) {
        res.send(users);
      } else {
        res.status(404);
      }
    } catch (error) {
      next(error);
    }
  }
);


usersRouter.get(
  "/googleLogin",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

usersRouter.get(
  "/googleRedirect",
  passport.authenticate("google", { session: false }),
  async (req, res, next) => {
    res.redirect(`${process.env.FE_URL}/?accessToken=${req.user.accessToken}`);
  }
);

usersRouter.put("/:userId", adminOnlyMiddleware, async (req, res, next) => {
  try {
    const updatedUser = await userModel.findByIdAndUpdate(
      req.params.userId,
      req.body,
      { new: true, runValidators: true }
    );
    if (updatedUser) {
      res.send(updatedUser);
    } else {
      next(
        createHttpError(404, `user with id ${req.user._id} does not exist!`)
      );
    }
  } catch (error) {
    next(error);
  }
});

usersRouter.delete("/:userId", adminOnlyMiddleware, async (req, res, next) => {
  try {
    const deletedUser = userModel.findByIdAndDelete(req.params.userId);
    if (deletedUser) {
      res.status(204).send();
    } else {
      next(
        createHttpError(404, `user with id ${req.user._id} does not exist!`)
      );
    }
  } catch (error) {
    next(error);
  }
});

export default usersRouter;
