import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import mkdirp from "mkdirp";
import mongoose from "mongoose";
import multer from "multer";
import mv from "mv";
import path from "path";
import { fileURLToPath } from "url";
import File from "./model/File.js";
import User from "./model/User.js";
import authenToken from "./middleware/authenToken.js";

dotenv.config();

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(
    "mongodb+srv://admin:Huyhuyhuy1998@cluster0.edeoy.mongodb.net/test"
  );
}

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./upload");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

var upload = multer({ storage: storage });

ffmpeg.setFfmpegPath("./ffmpeg/bin/ffmpeg.exe");

ffmpeg.setFfprobePath("./ffmpeg/bin/ffprobe.exe");

const app = express();

app.use(cors());
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use("/upload", express.static(path.join(__dirname, "upload")));

app.post("/getFile", authenToken, (req, res) => {
  // Check trong collection User xem loại user là gì
  User.findOne({ username: req.username }, function (err, user) {
    if (err) res.json({ status: 0, message: err });
    else {
      // Là modifier thì đưa ra tất cả listFile
      if (user.account_type === "modifier") {
        File.find().then((listFile) => {
          res.json({ status: 1, listFile: listFile });
        });
      } else {
        // Là người dùng bình thường thì đưa ra listFile mà họ có thôi
        File.find({ username: req.username }, function (err, listFile) {
          if (err) res.json({ status: 0, message: err });
          else res.json({ status: 1, listFile: listFile });
        });
      }
    }
  });
});

app.post("/removeFile", authenToken, (req, res) => {
  File.findById(req.body.id, function (err, file) {
    // Kiểm tra xem nó có phải chủ file không
    if (req.username === file.username) {
      let linkUpload =
        "./upload/" + file.username + "/input/" + file.file_upload;
      let linkConverted =
        "./upload/" + file.username + "/output/" + file.file_converted;
      if (fs.existsSync("./upload/" + file.username)) {
        // Xoá file upload
        fs.unlink(linkUpload, function (e) {
          if (e) console.log(e);
        });

        // Xoá file converted
        fs.unlink(linkConverted, function (e) {
          if (e) console.log(e);
        });

        // Xoá list segment
        let linkDirectory = "./upload/" + file.username + "/segment/";
        fs.readdir(linkDirectory, (err, files) => {
          if (err) console.log(err);

          for (const file of files) {
            fs.unlink(path.join(linkDirectory, file), (err) => {
              if (err) console.log(err);
            });
          }
        });
      }

      file.remove(function () {
        // Xoá data khỏi
        res.json({ status: 1, message: "Xoá file thành công!" });
      });
    } else {
      // Nếu không phải chủ file thì xem xem nó có phải admin k
      User.find(
        { username: req.username, account_type: "modifier" },
        function (err, userData) {
          if (err || userData.length === 0) {
            res.json({
              status: 0,
              message: "Không được xoá file không phải của mình",
            });
          } else {
            let linkUpload =
              "./upload/" + file.username + "/input/" + file.file_upload;
            let linkConverted =
              "./upload/" + file.username + "/output/" + file.file_converted;
            if (fs.existsSync("./upload/" + file.username)) {
              // Xoá file upload
              fs.unlink(linkUpload, function (e) {
                if (e) console.log(e);
              });

              // Xoá file converted
              fs.unlink(linkConverted, function (e) {
                if (e) console.log(e);
              });

              // Xoá list segment
              let linkDirectory = "./upload/" + file.username + "/segment/";
              fs.readdir(linkDirectory, (err, files) => {
                if (err) console.log(err);

                for (const file of files) {
                  fs.unlink(path.join(linkDirectory, file), (err) => {
                    if (err) console.log(err);
                  });
                }
              });
            }

            file.remove(function () {
              // Xoá data khỏi
              res.json({ status: 1, message: "Xoá file thành công!" });
            });
          }
        }
      );
    }
  });
});

app.post("/uploadFile", authenToken, upload.single("video"), (req, res) => {
  let username = req.username;
  let filename = req.file.filename;

  if (!fs.existsSync("./upload/" + username)) mkdirp("./upload/" + username);
  if (!fs.existsSync("./upload/" + username + "/input"))
    mkdirp("./upload/" + username + "/input");
  if (!fs.existsSync("./upload/" + username + "/segment"))
    mkdirp("./upload/" + username + "/segment");
  if (!fs.existsSync("./upload/" + username + "/output"))
    mkdirp("./upload/" + username + "/output");

  mv(
    "./upload/" + filename,
    "./upload/" + username + "/input/" + filename,
    (err) => {
      if (err) res.json({ status: 0, message: "Move File Fail!" });
    }
  );

  ffmpeg("./upload/" + username + "/input/" + filename)
    .outputOptions([
      "-f hls",
      "-max_muxing_queue_size 2048",
      "-hls_time 1",
      "-hls_list_size 0",
      "-hls_segment_filename",
      "./upload/" + username + "/segment/" + filename + "-%d.ts",
      "-hls_base_url",
      process.env.URL +
        ":" +
        process.env.PORT_DATA_SERVER +
        "/upload/" +
        username +
        "/segment/",
    ])
    .output("./upload/" + username + "/output/" + filename + ".m3u8")
    .on("start", function (commandLine) {
      console.log("Spawned Ffmpeg with command: " + commandLine);
    })
    .on("error", function (err, stdout, stderr) {
      console.log("An error occurred: " + err.message, err, stderr);
    })
    .on("progress", function (progress) {
      console.log("Processing: " + progress.percent + "% done");
    })
    .on("end", function (err, stdout, stderr) {
      console.log("Finished processing!" /*, err, stdout, stderr*/);
      // Lưu dữ liệu vào server xong. Giờ lưu thông tin vào server
      let file = new File({
        username: username,
        file_upload: filename,
        file_converted: filename + ".m3u8",
      });
      file.save().then(() => {
        res.json({ status: 1, message: "Upload và convert file thành công!" });
      });
    })
    .run();
});

app.get("/:id/tai-file-upload", function (req, res) {
  File.findById(req.params.id, function (err, file) {
    res.download(
      "./upload/" + file.username + "/input/" + file.file_upload,
      function (err) {
        if (err) console.log(err);
      }
    );
  });
});

app.get("/:id/tai-file-convert", function (req, res) {
  File.findById(req.params.id, function (err, file) {
    res.download(
      "./upload/" + file.username + "/output/" + file.file_converted,
      function (err) {
        if (err) console.log(err);
      }
    );
  });
});

app.listen(process.env.PORT_DATA_SERVER || 3002, () =>
  console.log(
    "DataServer listening on: " + process.env.PORT_DATA_SERVER || 3002
  )
);
