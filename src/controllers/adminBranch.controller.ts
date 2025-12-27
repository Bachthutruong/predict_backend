import { Response } from 'express';
import Branch from '../models/Branch';
import { AuthRequest } from '../middleware/auth';

export const listBranches = async (req: AuthRequest, res: Response) => {
    try {
        const branches = await Branch.find().sort({ createdAt: -1 });
        res.json({ success: true, data: branches });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getBranchById = async (req: AuthRequest, res: Response) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
        res.json({ success: true, data: branch });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

export const createBranch = async (req: AuthRequest, res: Response) => {
    try {
        const branch = new Branch(req.body);
        await branch.save();
        res.status(201).json({ success: true, data: branch });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const updateBranch = async (req: AuthRequest, res: Response) => {
    try {
        const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
        res.json({ success: true, data: branch });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const deleteBranch = async (req: AuthRequest, res: Response) => {
    try {
        const branch = await Branch.findByIdAndDelete(req.params.id);
        if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
        res.json({ success: true, message: 'Branch deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
