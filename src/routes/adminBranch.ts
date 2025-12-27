import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { listBranches, createBranch, getBranchById, updateBranch, deleteBranch } from '../controllers/adminBranch.controller';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['admin']));

router.get('/', listBranches);
router.post('/', createBranch);
router.get('/:id', getBranchById);
router.put('/:id', updateBranch);
router.delete('/:id', deleteBranch);

export default router;
