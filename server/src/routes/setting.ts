import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getProfile, updateProfile } from '../services/setting/profile.js';
import {
  getEmailConfigs,
  getEmailConfigById,
  createEmailConfig,
  updateEmailConfig,
  deleteEmailConfig,
  testEmailConfig,
} from '../services/setting/email.js';
import { getAiConfig, getAiConfigs, getAiConfigById, createAiConfig, updateAiConfigFull, deleteAiConfig, testAiConfig, screenResumeWithAi, batchScreenResumesWithAi, generateInterviewQuestions } from '../services/setting/ai.js';

const router: RouterType = Router();

// 获取个人信息
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const profile = await getProfile(userId);
    
    res.status(200).json({
      code: 200,
      data: profile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取个人信息失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// 更新个人信息
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { username, avatar } = req.body;
    
    const profile = await updateProfile(userId, { username, avatar });
    
    res.status(200).json({
      code: 200,
      data: profile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新个人信息失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// ============ 邮箱配置相关接口 ============

// 获取邮箱配置列表
router.get('/emails', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const configs = await getEmailConfigs(userId);
    
    res.status(200).json({
      code: 200,
      data: configs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取邮箱配置失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// 获取单个邮箱配置
router.get('/emails/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const configId = parseInt(req.params.id as string, 10);
    
    if (isNaN(configId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的配置ID',
      });
    }
    
    const config = await getEmailConfigById(userId, configId);
    
    if (!config) {
      return res.status(404).json({
        code: 404,
        message: '邮箱配置不存在',
      });
    }
    
    res.status(200).json({
      code: 200,
      data: config,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取邮箱配置失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// 创建邮箱配置
router.post('/emails', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { email, authCode, imapHost, imapPort, smtpHost, smtpPort, isDefault } = req.body;
    
    if (!email || !authCode) {
      return res.status(400).json({
        code: 400,
        message: '邮箱地址和授权码不能为空',
      });
    }
    
    const config = await createEmailConfig(userId, {
      email,
      authCode,
      imapHost,
      imapPort,
      smtpHost,
      smtpPort,
      isDefault,
    });
    
    res.status(201).json({
      code: 201,
      data: config,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建邮箱配置失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// 更新邮箱配置
router.put('/emails/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const configId = parseInt(req.params.id as string, 10);
    
    if (isNaN(configId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的配置ID',
      });
    }
    
    const { email, authCode, imapHost, imapPort, smtpHost, smtpPort, isDefault } = req.body;
    
    const config = await updateEmailConfig(userId, configId, {
      email,
      authCode,
      imapHost,
      imapPort,
      smtpHost,
      smtpPort,
      isDefault,
    });
    
    res.status(200).json({
      code: 200,
      data: config,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新邮箱配置失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// 删除邮箱配置
router.delete('/emails/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const configId = parseInt(req.params.id as string, 10);
    
    if (isNaN(configId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的配置ID',
      });
    }
    
    await deleteEmailConfig(userId, configId);
    
    res.status(200).json({
      code: 200,
      message: '删除成功',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除邮箱配置失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// 测试邮箱配置
router.post('/emails/:id/test', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const configId = parseInt(req.params.id as string, 10);
    
    if (isNaN(configId)) {
      return res.status(400).json({
        code: 400,
        message: '无效的配置ID',
      });
    }
    
    const result = await testEmailConfig(userId, configId);
    
    res.status(200).json({
      code: result.success ? 200 : 400,
      data: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '测试邮箱配置失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// ============ AI 配置相关接口 ============

// 获取 AI 配置列表
router.get('/ai/list', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const configs = await getAiConfigs(userId);
    
    res.status(200).json({
      code: 200,
      data: configs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取 AI 配置列表失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// 获取默认 AI 配置
router.get('/ai', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const config = await getAiConfig(userId);
    
    res.status(200).json({
      code: 200,
      data: config,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取 AI 配置失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// 创建 AI 配置
router.post('/ai', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { name, model, apiUrl, apiKey, prompt, isDefault } = req.body;
    
    if (!name) {
      return res.status(400).json({
        code: 400,
        message: '请输入配置名称',
      });
    }
    
    const config = await createAiConfig(userId, {
      name,
      model,
      apiUrl,
      apiKey,
      prompt,
      isDefault,
    });
    
    res.status(200).json({
      code: 200,
      data: config,
      message: '创建成功',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建 AI 配置失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// 测试 AI 配置
router.post('/ai/test', authenticate, async (req: Request, res: Response) => {
  try {
    const { model, apiUrl, apiKey, task } = req.body;
    
    if (!model || !apiUrl || !apiKey) {
      return res.status(400).json({
        code: 400,
        message: '请提供 model、apiUrl 和 apiKey',
      });
    }
    
    const result = await testAiConfig({ model, apiUrl, apiKey, task });
    
    // 始终返回 200，让前端业务代码处理 success/failure
    // 不论连接是否成功，都应该把结果返回给前端展示
    res.status(200).json({
      code: 200,
      data: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '测试 AI 配置失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// 更新 AI 配置
router.put('/ai/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const configId = parseInt(req.params.id as string, 10);
    const { name, model, apiUrl, apiKey, prompt, isDefault } = req.body;
    
    const config = await updateAiConfigFull(userId, configId, {
      name,
      model,
      apiUrl,
      apiKey,
      prompt,
      isDefault,
    });
    
    if (!config) {
      return res.status(404).json({
        code: 404,
        message: '配置不存在',
      });
    }
    
    res.status(200).json({
      code: 200,
      data: config,
      message: '更新成功',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新 AI 配置失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// 删除 AI 配置
router.delete('/ai/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const configId = parseInt(req.params.id as string, 10);
    
    const success = await deleteAiConfig(userId, configId);
    
    if (!success) {
      return res.status(404).json({
        code: 404,
        message: '配置不存在',
      });
    }
    
    res.status(200).json({
      code: 200,
      message: '删除成功',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除 AI 配置失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// ============ AI 筛选简历相关接口 ============

// 使用 AI 筛选单个简历
router.post('/ai/screen', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { resumeId, jobRequirements, aiConfigId } = req.body;
    
    if (!resumeId) {
      return res.status(400).json({
        code: 400,
        message: '请提供简历 ID',
      });
    }
    
    if (!jobRequirements) {
      return res.status(400).json({
        code: 400,
        message: '请提供岗位要求',
      });
    }
    
    const result = await screenResumeWithAi(userId, resumeId, jobRequirements, aiConfigId);
    
    if (!result.success) {
      return res.status(400).json({
        code: 400,
        message: result.error,
      });
    }
    
    res.status(200).json({
      code: 200,
      data: result.result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI 筛选简历失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// 批量使用 AI 筛选简历
router.post('/ai/batch-screen', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { resumeIds, jobRequirements, aiConfigId } = req.body;
    
    if (!resumeIds || !Array.isArray(resumeIds) || resumeIds.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请提供简历 ID 列表',
      });
    }
    
    if (!jobRequirements) {
      return res.status(400).json({
        code: 400,
        message: '请提供岗位要求',
      });
    }
    
    const result = await batchScreenResumesWithAi(userId, resumeIds, jobRequirements, aiConfigId);
    
    res.status(200).json({
      code: 200,
      data: result.results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '批量 AI 筛选简历失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

// 生成面试题
router.post('/ai/interview-questions', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { resumeId, customFocus, aiConfigId, questionCount } = req.body;

    if (!resumeId) {
      return res.status(400).json({
        code: 400,
        message: '请提供简历 ID',
      });
    }

    const result = await generateInterviewQuestions(userId, resumeId, customFocus, aiConfigId, questionCount);

    if (!result.success) {
      return res.status(400).json({
        code: 400,
        message: result.error,
      });
    }

    res.status(200).json({
      code: 200,
      data: result.result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '生成面试题失败';
    res.status(400).json({
      code: 400,
      message,
    });
  }
});

export default router;
