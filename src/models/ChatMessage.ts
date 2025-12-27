import mongoose, { Schema, models, model } from 'mongoose';

const ChatMessageSchema = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User' }, // If null, maybe broadcast or sent to "System/Admin" channel logic
    isAdmin: { type: Boolean, default: false }, // True if sender is admin/staff
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
    attachments: [{ type: String }],
}, { timestamps: true });

const ChatMessage = models?.ChatMessage || model('ChatMessage', ChatMessageSchema);
export default ChatMessage;
