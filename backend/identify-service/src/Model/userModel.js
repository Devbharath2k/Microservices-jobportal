import mongoose from 'mongoose';

const { Schema } = mongoose;

const UserSchema = new Schema({
  fname: {
    type: String,
    required: true
  },
  lname: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  forgot_password_otp: {
    type: String,
    default: null
  },
  forgot_password_otp_expiry: {
    type: Date,
    default: null
  },
  last_Login_at: {
    type: Date
  },
  isverfied: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  isstatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  refresh_token:{
    type: String,
    default: ""
  },
  profile: {
    bio: { type: String },
    skills: [{ type: String }],
    education: [{ type: String }],
    projects: [{ type: String }],
    profilephoto: {
      type: String,
      default: ""
    },
    resume: {
      type: String,
      default: ""
    },
    originalname: {
      type: String,
      default: ""
    }
  }
}, { timestamps: true }); // ✅ fixed here

const User = mongoose.model('User', UserSchema);

export default User;
