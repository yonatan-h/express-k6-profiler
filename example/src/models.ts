//create user model
//
//
import mongoose, { Model, Schema, Types } from 'mongoose';

export const UserModel = mongoose.model(
  'User',
  new Schema(
    {
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true }, //never store plain text passwords btw!
    },
    { timestamps: true },
  ),
);

export const OrderModel = mongoose.model(
  'Order',
  new Schema(
    {
      itemName: {type:String, required:true},
      user:{
        type: Types.ObjectId,
        ref: 'User'
      }
    }
  )
)
