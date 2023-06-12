const fs = require("fs");
const path = require("path");

const checkDir = (req, res, next) => {
  const exists = fs.existsSync(
    path.join(__dirname, "../../assets/employer-images")
  );
  if (!exists) {
    fs.mkdirSync(path.join(__dirname, "../../assets/employer-images"), {
      recursive: true,
    });
  }
  next();
};

module.exports = checkDir;
