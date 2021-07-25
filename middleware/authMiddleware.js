const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      console.log(error);
      return res.status(401).send("Unauthorized");
    }

    const { userId } = jwt.verify(
      req.headers.authorization,
      process.env.jwtSecret
    );

    req.userId = userId;
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).send("Unauthorized");
  }
};
