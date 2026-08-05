 
import { Document, model, Schema, Types } from "mongoose";
import crypto from "crypto"; 
 
export interface IBooking extends Document{
   user:Types.ObjectId;
   restaurant:Types.ObjectId;
   date:Date;
   time:string;
   guests:number;
    occasion?: string;
    specialRequests?: string;
    status: "confirmed" | "cancelled" | "completed";
    bookingId:string;
    createdAt : Date;
    updatedAt : Date;
}
const BookingSchema = new Schema<IBooking>(
    {
        user: {type:Schema.Types.ObjectId,ref:"User",required:true},
        restaurant: {type:Schema.Types.ObjectId,ref:"Restaurant",required:true},
        
        date:{type:Date,required:true},
        time:{type:String,required:true},
        guests:{type:Number,required :true,min:1},
        occasion:{type:String ,enum:["confirmed","cancelled","completed"],default:"confirmed"},
        bookingId:{type:String,unique:true},
    },
    {timestamps:true}
)

//Auto-generate reference code on save 
BookingSchema.pre("save",function(){
    if(!this.bookingId){
        this.bookingId=`GR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`
    }
})


export const Booking  =model<IBooking>("User",BookingSchema)



