import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { loginUser, refreshToken } from '../services/login/login.js';
import { registerUser } from '../services/login/register.js';

const router: RouterType = Router();

// 校验中间件
const validate = (fields: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    const missing = fields.filter(field => !req.body[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        code: 400,
        message: `缺少字段: ${missing.join(', ')}`
      });
    }
    next();
  };
};

// 登录
router.post('/login', validate(['email', 'password']), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });
    
    res.status(200).json({
      code: 200,
      data: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '登录失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// 注册
router.post('/register', validate(['username', 'email', 'password']), async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    await registerUser({ username, email, password });
    
    res.status(200).json({
      code: 200,
      data: { message: '注册成功，请登录' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '注册失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// 刷新 Token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        code: 400,
        message: '缺少 refreshToken'
      });
    }
    
    const result = refreshToken(token);
    
    res.status(200).json({
      code: 200,
      data: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token 刷新失败';
    res.status(401).json({
      code: 401,
      message,
    });
  }
});

export default router;
