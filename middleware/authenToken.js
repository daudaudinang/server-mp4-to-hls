import jwt from 'jsonwebtoken';

export default function authenToken(req, res, next) {
    // Lấy ra header người dùng gửi lên
    const authorizationHeader = req.headers['authorization'];
    req.err = authorizationHeader;

    // authorization người dùng gửi lên sẽ có dạng là 1 string: 'Beaer [token]'
    const token = authorizationHeader.split(' ')[1];
    if(!token) res.json({status:0, message:"Sai token access"});
    else {
    // Xác thực với jwt 
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, data) => {
            if(err) res.json({status:0, message:"Sai token access " + token});
            else {
                req.username = data.username;
                next();
            }
        });
    }
}