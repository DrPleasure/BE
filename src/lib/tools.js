import jwt from "jsonwebtoken";
import { body } from "express-validator"

export const createAccessToken = (payload) =>
  new Promise((resolve, reject) =>
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1week" },
      (err, token) => {
        if (err) reject(err);
        else {
          console.log('Generated access token:', token);
          resolve(token);
        }
      }
    )
  );


export const verifyAccessToken = (token) =>
  new Promise((resolve, reject) =>
    jwt.verify(token, process.env.JWT_SECRET, (err, originalPayload) => {
      if (err) reject(err);
      else resolve(originalPayload);
    })
  );

