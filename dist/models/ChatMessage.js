"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ChatMessageSchema = new mongoose_1.Schema({
    sender: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }, // If null, maybe broadcast or sent to "System/Admin" channel logic
    isAdmin: { type: Boolean, default: false }, // True if sender is admin/staff
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
    attachments: [{ type: String }],
}, { timestamps: true });
const ChatMessage = mongoose_1.models?.ChatMessage || (0, mongoose_1.model)('ChatMessage', ChatMessageSchema);
exports.default = ChatMessage;
//# sourceMappingURL=ChatMessage.js.map