import mongoose, { Schema, models, model } from 'mongoose';

const BranchSchema = new Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    coordinates: {
        lat: { type: Number },
        lng: { type: Number }
    }
}, { timestamps: true });

BranchSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});

const Branch = models?.Branch || model('Branch', BranchSchema);
export default Branch;
