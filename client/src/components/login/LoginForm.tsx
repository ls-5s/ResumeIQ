import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, CheckCircle2, AlertCircle, Github } from "lucide-react";
import { login } from "../../api/login";
import { getGithubAuthUrl } from "../../api/auth";
import { useLoginStore } from "../../store/Login";
import toast from "../../utils/toast";

const REMEMBER_KEY = "auth_remember_email";
const EMAIL_KEY = "auth_saved_email";

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const form = useForm<LoginFormData>({ defaultValues: { email: "", password: "" } });
  const { reset } = form;
  const { login: storeLogin } = useLoginStore();

  useEffect(() => {
    const savedRemember = localStorage.getItem(REMEMBER_KEY) === "1";
    const savedEmail = localStorage.getItem(EMAIL_KEY) ?? "";
    setRemember(savedRemember);
    if (savedRemember && savedEmail) reset({ email: savedEmail, password: "" });
  }, [reset]);

  const addRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((r) => [...r, { x, y, id }]);
    setTimeout(() => setRipples((r) => r.filter((i) => i.id !== id)), 620);
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      storeLogin(await login(data));
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, "1");
        localStorage.setItem(EMAIL_KEY, data.email);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
        localStorage.removeItem(EMAIL_KEY);
      }
      toast.success("登录成功");
      navigate("/app");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "登录失败");
    } finally {
      setIsLoading(false);
    }
  };

  const emailErr = form.formState.errors.email?.message;
  const passErr = form.formState.errors.password?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {/* 邮箱字段 */}
      <div className="login-field">
        <div className="login-input-wrap">
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder=" "
            className={`login-input ${emailErr ? "error" : ""}`}
            {...form.register("email", {
              required: "请输入邮箱",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "请输入有效的邮箱地址",
              },
            })}
          />
          <label htmlFor="login-email" className="login-input-label-float">
            邮箱地址
          </label>
        </div>
        {emailErr && (
          <p className="login-error">
            <AlertCircle size={13} aria-hidden />
            {emailErr}
          </p>
        )}
      </div>

      {/* 密码字段 */}
      <div className="login-field">
        <div className="login-input-wrap">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder=" "
            className={`login-input login-input-with-icon ${passErr ? "error" : ""}`}
            {...form.register("password", {
              required: "请输入密码",
              minLength: { value: 6, message: "密码至少 6 位" },
            })}
          />
          <label htmlFor="login-password" className="login-input-label-float">
            登录密码
          </label>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="login-eye-btn"
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {passErr && (
          <p className="login-error">
            <AlertCircle size={13} aria-hidden />
            {passErr}
          </p>
        )}
      </div>

      {/* 记住 & 忘记密码 */}
      <div className="login-row-between">
        <label className="login-checkbox-wrap">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="login-checkbox"
          />
          <span>记住我的邮箱</span>
        </label>
        <button
          type="button"
          className="login-link-btn"
          onClick={() => toast.info("请联系管理员重置密码")}
        >
          忘记密码？
        </button>
      </div>

      {/* 提交按钮 */}
      <button
        ref={btnRef}
        type="submit"
        disabled={isLoading}
        className="login-submit-btn"
        onClick={addRipple}
      >
        {isLoading ? (
            <span className="inline-flex items-center justify-center gap-2 btn-spinner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" aria-hidden>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            正在验证身份...
          </span>
        ) : (
          <>
            {ripples.map((r) => (
              <span
                key={r.id}
                className="ripple"
                style={{ ["--ripple-x" as string]: `${r.x}px`, ["--ripple-y" as string]: `${r.y}px` }}
                aria-hidden
              />
            ))}
            <span className="inline-flex items-center justify-center gap-2">
              <CheckCircle2 size={16} aria-hidden />
              登录
            </span>
          </>
        )}
      </button>

      {/* 分隔线 */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">或</span>
        </div>
      </div>

      {/* GitHub 登录按钮 */}
      <GithubLoginButton />
    </form>
  );
}

// GitHub 登录按钮组件
function GithubLoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGithubLogin = async () => {
    setIsLoading(true);
    try {
      const { url } = await getGithubAuthUrl();
      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "获取授权链接失败");
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGithubLogin}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
    >
      {isLoading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" aria-hidden>
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          跳转中...
        </span>
      ) : (
        <>
          <Github size={18} />
          使用 GitHub 登录
        </>
      )}
    </button>
  );
}
