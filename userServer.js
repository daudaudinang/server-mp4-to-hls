import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mkdirp from "mkdirp";
import File from "./model/File.js";
import User from "./model/User.js";
import mongoose from "mongoose";
import authenToken from "./middleware/authenToken.js";
import fs from "fs";
// import authenModifier from './middleware/authenModifier.js';

dotenv.config();

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(
    "mongodb+srv://admin:Huyhuyhuy1998@cluster0.edeoy.mongodb.net/test"
  );
}

const app = express();

app.use(express.json());
app.use(cors());

// Người dùng đăng ký
app.post("/register", function (req, res, next) {
  User.find({ username: req.body.username }, function (err, data) {
    if(err) console.log(err);
    else if (data.length > 0) {
      res.json({ status: 0, message: "Tài khoản đã tồn tại!" });
    } else {
      let user = new User({
        username: req.body.username,
        password: req.body.password,
        account_type: "normal",
        listFile: [],
      });
      user.save().then(() => {
        let dir1 = "./upload/" + req.body.username;
        let dir2 = dir1 + "/input";
        let dir3 = dir1 + "/output";
        let dir4 = dir1 + "/segment";
        mkdirp(dir1);
        mkdirp(dir2);
        mkdirp(dir3);
        mkdirp(dir4);
        res.json({ status: 1, message: "Tạo tài khoản thành công!" });
      });
    }
  });
});

function authenModifier(req, res, next) {
  User.find({username: req.username, account_type: "modifier"}, function(err, data){
      if(err || !data) res.json({status:0, message:"Chỉ tài khoản Admin mới được quyền chỉnh sửa data User"});
      else next();
  });
};

app.post('/getUser', authenToken, authenModifier, (req, res) => {
  User.findById(req.body.id, function(err, user){
    if(err) res.json({status: 0, message: err});
    else {
      if(user) res.json({status: 1, user: user});
      else res.json({status: 0, message:"User not found!"});
    }
  })
});

app.post('/getUserList', authenToken, authenModifier, (req, res) => {
  console.log(req.username);
  User.find()
  .then(userList => {
    res.json({status: 1, userList});
  })
  .catch(err => {
    res.json({status: 0, message: err})
  });
});

// Admin thêm User
app.post('/addUser', authenToken, authenModifier, function (req, res, next) {

  User.find({username: req.body.username}, function(err, data){
    if(err) res.json({status: 0, message:"Không tìm thấy người dùng"})
    else if(data.length > 0){
      res.json({status:0, message:"Tài khoản đã tồn tại"});
    } else {
      let user = new User({
        username: req.body.username,
        password: req.body.password,
        account_type: req.body.account_type,
        listFile: []
      });
      user.save().then(function () {
        let dir1 = './upload/'+ req.body.username;
        let dir2 = dir1 + '/input';
        let dir3 = dir1 + '/output';
        let dir4 = dir1 + '/segment';
        mkdirp(dir1);
        mkdirp(dir2);
        mkdirp(dir3);
        mkdirp(dir4);
        res.json({ status: 1, message: "Tạo tài khoản thành công!" });
      });
    }
  });
});

// Sua user
app.post('/editUser', authenToken, authenModifier, function (req, res, next) {
  User.findById(req.body.id, function (err, user) {
    if (err || !user) res.json({status:0, message:"Không tìm thấy người dùng!"});
    else{
      user.account_type = req.body.account_type;
      user.username = req.body.username;
      user.password = req.body.password;
      user.save().then(function () {
        res.json({ status: 1, message: "Sửa thông tin người dùng thành công!" });
      });
    }
  });
});

// Xoá user
app.post('/removeUser', authenToken, authenModifier, function (req, res, next) {
  User.findById(req.body.id, function (err, user) {
    if(err || !user) res.json({status:0, message:"Không tìm thấy người dùng!"});
    else {
      //Xoá directory mà user này upload
      fs.rmdirSync('./upload/'+ user.username, { recursive: true });
      
      // Xoá listFile mà User này đã upload khỏi Database
      File.deleteMany({username : user.username}, function(err, data){
        console.log(`Clear data ${user.username} success`);
      })

      // Xoá user khỏi database
      user.remove(function () { 
        res.json({ status: 1, message: "Xoá người dùng thành công!" });
      });
    }
  });
});

app.listen(process.env.PORT_USER_SERVER || 3003, () =>
  console.log(
    "User Server listening on: " + process.env.PORT_USER_SERVER || 3003
  )
);
