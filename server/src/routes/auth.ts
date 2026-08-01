import express from 'express';
import { requestOTP, verifyOTPAndRegister, login, resetPassword, getMe, updatePreferences, deleteAccount } from '../controllers/auth';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.post('/request-otp', requestOTP);
router.post('/register', verifyOTPAndRegister);
router.post('/login', login);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', requireAuth as any, getMe);
router.put('/preferences', requireAuth as any, updatePreferences);
router.delete('/delete-account', requireAuth as any, deleteAccount);

export default router;
