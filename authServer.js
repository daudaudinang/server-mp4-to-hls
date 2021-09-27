import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "./model/User.js";

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(
    "mongodb+srv://admin:Huyhuyhuy1998@cluster0.edeoy.mongodb.net/test"
  );
}

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.post("/refreshToken", (req, res) => {
  const refreshToken = req.body.refresh_token;

  // Check xem thằng client có gửi refreshToken không?
  if (!refreshToken) res.sendStatus(401);
  else {
    User.findOne({ refresh_token: refreshToken }, function (err, user) {
      // Check xem có mã token này trong database không
      if (err) console.log(err);
      else if (!user) res.sendStatus(403);
      // Lỗi 403: User không có quyền truy xuất dữ liệu trong route
      else {
        // Decoded nó xem có đúng refresh_token_secret không
        jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET,
          (err, data) => {
            if (err) console.log(err);

            // Thay access_token mới và res về
            const access_token = jwt.sign(
              { username: data.username},
              process.env.ACCESS_TOKEN_SECRET,
              { expiresIn: "60s" }
            );
            res.json({ status:1, access_token });
          }
        );
      }
    });
  }
});

app.post("/login", (req, res) => {
  const dataLogin = req.body; // Thông tin mà người dùng submit lên
  User.findOne(
    { username: dataLogin.username, password: dataLogin.password },
    function (err, data) {
      if (err || !data) res.json({status:0, message:"Đăng nhập thất bại!"});
      else {
        const access_token = jwt.sign(
          { username: data.username},
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "60s" }
        );
        const refresh_token = jwt.sign(
          { username: data.username },
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: "24h" }
        );

        // Lưu refresh_token vào database và gửi trả access_token và refresh_token cho client
        data.refresh_token = refresh_token;
        data.save().then(() => {
          res.json({
            status: 1,
            username: dataLogin.username,
            access_token,
            refresh_token,
            account_type: data.account_type,
            message:"Đăng nhập thành công!"
          });
        });
      }
    }
  );
});

app.post("/logout", (req, res) => {
  const refreshToken = req.body.refresh_token;
  // Check xem thằng client có gửi refreshToken không?
  if (!refreshToken) res.json({status:0, message:"Refresh Token không tồn tại"});
  else {
    // Xoá token trong database
    User.findOne({ refresh_token: refreshToken }, function (err, user) {
      // Check xem có mã token này trong database không
      if (err) res.json({status:0, message:"Error Database"});
      else if (!user) res.json({status:0, message:"User không tồn tại!"});
      else {
        user.refresh_token =
          "bhsahsasasasmsasququisqbsqisaiasmasuhqiusnqiusnqsyuqinsqssimakasas";
        user.save();
        res.json({status: 1, message:"Đăng xuất thành công!"});
      }
    });
  }
});

app.listen(process.env.PORT_AUTH || 3001, () =>
  console.log("Auth Server listening on port: " + process.env.PORT_AUTH || 3001)
);
