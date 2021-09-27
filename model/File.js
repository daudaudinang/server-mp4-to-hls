import mongoose from 'mongoose';
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

var File = new Schema({
  username: String,
  file_upload: String,
  file_converted: String,
},{collection : 'file', usePushEach: true });

export default mongoose.model('File', File);