"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBranch = exports.updateBranch = exports.createBranch = exports.getBranchById = exports.listBranches = void 0;
const Branch_1 = __importDefault(require("../models/Branch"));
const listBranches = async (req, res) => {
    try {
        const branches = await Branch_1.default.find().sort({ createdAt: -1 });
        res.json({ success: true, data: branches });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.listBranches = listBranches;
const getBranchById = async (req, res) => {
    try {
        const branch = await Branch_1.default.findById(req.params.id);
        if (!branch)
            return res.status(404).json({ success: false, message: 'Branch not found' });
        res.json({ success: true, data: branch });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getBranchById = getBranchById;
const createBranch = async (req, res) => {
    try {
        const branch = new Branch_1.default(req.body);
        await branch.save();
        res.status(201).json({ success: true, data: branch });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.createBranch = createBranch;
const updateBranch = async (req, res) => {
    try {
        const branch = await Branch_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!branch)
            return res.status(404).json({ success: false, message: 'Branch not found' });
        res.json({ success: true, data: branch });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateBranch = updateBranch;
const deleteBranch = async (req, res) => {
    try {
        const branch = await Branch_1.default.findByIdAndDelete(req.params.id);
        if (!branch)
            return res.status(404).json({ success: false, message: 'Branch not found' });
        res.json({ success: true, message: 'Branch deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.deleteBranch = deleteBranch;
//# sourceMappingURL=adminBranch.controller.js.map