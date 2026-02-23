import express from 'express';
import { authenticate, staffMiddleware } from '../middleware/auth';
import {
  createNews,
  deleteNews,
  getManageNewsById,
  getManageNewsList,
  getNewsBySlug,
  getNewsList,
  updateNews
} from '../controllers/news.controller';

const router = express.Router();

router.get('/manage/all', authenticate, staffMiddleware, getManageNewsList);
router.get('/manage/:id', authenticate, staffMiddleware, getManageNewsById);
router.post('/manage', authenticate, staffMiddleware, createNews);
router.put('/manage/:id', authenticate, staffMiddleware, updateNews);
router.delete('/manage/:id', authenticate, staffMiddleware, deleteNews);

router.get('/', getNewsList);
router.get('/:slug', getNewsBySlug);

export default router;
