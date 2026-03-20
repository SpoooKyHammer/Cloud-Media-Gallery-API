import { Router } from 'express';

import authController from '../controllers/authController';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import {
  validateRegister,
  validateLogin,
  validateRefreshToken,
} from './validators/authValidators';

const router = Router();

router.post('/register', validate(validateRegister), authController.register);
router.post('/login', validate(validateLogin), authController.login);
router.post('/refresh-token', validate(validateRefreshToken), authController.refreshToken);

router.get('/me', authenticate, (req: AuthRequest, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

export default router;
