import express from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth } from '../middleware/auth';
import { getVoiceProfile, createVoiceProfile, deleteVoiceProfile } from '../controllers/voice';
import fs from 'fs';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `voice_${Date.now()}.wav`);
  }
});

const upload = multer({ storage });

router.get('/', requireAuth, getVoiceProfile);
router.post('/', requireAuth, upload.single('audio'), createVoiceProfile);
router.delete('/', requireAuth, deleteVoiceProfile);

export default router;
