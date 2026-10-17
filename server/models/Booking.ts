 
import { Document, model, Schema, Types } from "mongoose";
import crypto from "crypto"; 

export const BOOKING_OCCASIONS = ["Birthday", "Anniversary", "Date Night", "Business Dining"] as const;
export type BookingOccasion = (typeof BOOKING_OCCASIONS)[number];
 
export interface IBooking extends Document{
   user:Types.ObjectId;
   restaurant:Types.ObjectId;
   date:Date;
   time:string;
   guests:number;
   contact?: { name: string; email: string; phone: string };
    occasion?: BookingOccasion;
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
        guests:{type:Number,required :true,min:1,validate:Number.isInteger},
        // Optional for legacy records; required for new bookings by the API.
        contact: { type: new Schema({ name: {type:String,required:true,maxlength:100}, email: {type:String,required:true,maxlength:254}, phone: {type:String,required:true,maxlength:30} }, { _id:false }), required:false },
        occasion:{type:String,enum:[...BOOKING_OCCASIONS]},
        specialRequests:{type:String,trim:true,maxlength:1000},
        status:{type:String,enum:["confirmed","cancelled","completed"],default:"confirmed"},
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


BookingSchema.index({ restaurant:1, date:1, time:1, status:1 });
export const Booking  =model<IBooking>("Booking",BookingSchema)



