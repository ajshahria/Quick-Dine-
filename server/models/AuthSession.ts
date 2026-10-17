import { Schema, model } from "mongoose";
const schema = new Schema({
  _id: { type:String, required:true },
  user: { type:Schema.Types.ObjectId, ref:"User", required:true },
  expiresAt: { type:Date, required:true, index:{ expires:0 } },
});
export const AuthSession = model("AuthSession", schema);
