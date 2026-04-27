import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { register as registerApi } from "../../api/login";
import toast from "../../utils/toast";

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type Strength = "none" | "weak" | "fair" | "good" | "strong";

function getPasswordStrength(pw: string): Strength {
  if (!pw) return "none";
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return "weak";
  if (score === 2) return "fair";
  if (score === 3) return "good";
  return "strong";
}

const STRENGTH_CONFIG: Record<Strength, { active: string; label: string }> = {
  none:    { active: "", label: "" },
  weak:    { active: "active-weak", label: "弱" },
  fair:    { active: "active-fair", label: "一般" },
  good:    { active: "active-good", label: "良好" },
  strong:  { active: "active-strong", label: "很强" },
};

const STRENGTH_SEGS = [0, 1, 2, 3];

export function RegisterForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const form = useForm<RegisterFormData>();

  const password = form.watch("password", "");
  const strength = getPasswordStrength(password);
  const strengthCfg = STRENGTH_CONFIG[strength];
  const activeSegs = strength === "none" ? 0 : strength === "weak" ? 1 : strength === "fair" ? 2 : strength === "good" ? 3 : 4;

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

  const onSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      form.setError("confirmPassword", { message: "两次密码输入不一致" });
      return;
    }
    if (strength === "weak") {
      form.setError("password", { message: "密码强度太弱，请使用更复杂的密码" });
      return;
    }
    setIsLoading(true);
    try {
      await registerApi({
        username: data.username,
        email: data.email,
        password: data.password,
      });
      toast.success("注册成功，请登录！");
      onSuccess?.();
      form.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "注册失败");
    } finally {
      setIsLoading(false);
    }
  };

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? (
      <p className="login-error">
        <AlertCircle size={13} aria-hidden />
        {msg}
      </p>
    ) : null;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {/* 用户名 */}
      <div className="login-field">
        <div className="login-input-wrap">
          <input
            id="reg-username"
            type="text"
            autoComplete="username"
            placeholder=" "
            className={`login-input ${form.formState.errors.username ? "error" : ""}`}
            {...form.register("username", {
              required: "请输入用户名",
              minLength: { value: 2, message: "用户名至少 2 位" },
            })}
          />
          <label htmlFor="reg-username" className="login-input-label-float">
            用户名
          </label>
        </div>
        <FieldError msg={form.formState.errors.username?.message} />
      </div>

      {/* 邮箱 */}
      <div className="login-field">
        <div className="login-input-wrap">
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder=" "
            className={`login-input ${form.formState.errors.email ? "error" : ""}`}
            {...form.register("email", {
              required: "请输入邮箱",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "请输入有效的邮箱地址",
              },
            })}
          />
          <label htmlFor="reg-email" className="login-input-label-float">
            邮箱地址
          </label>
        </div>
        <FieldError msg={form.formState.errors.email?.message} />
      </div>

      {/* 密码 */}
      <div className="login-field">
        <div className="login-input-wrap">
          <input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder=" "
            className={`login-input login-input-with-icon ${form.formState.errors.password ? "error" : ""}`}
            {...form.register("password", {
              required: "请输入密码",
              minLength: { value: 6, message: "密码至少 6 位" },
            })}
          />
          <label htmlFor="reg-password" className="login-input-label-float">
            设置密码
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
        <FieldError msg={form.formState.errors.password?.message} />

        {/* 密码强度 */}
        <div className="login-strength-wrap">
          <div className="login-strength-bar">
            {STRENGTH_SEGS.map((i) => (
              <div
                key={i}
                className={`login-strength-seg ${
                  i < activeSegs ? strengthCfg.active : ""
                }`}
              />
            ))}
          </div>
          {strengthCfg.label && (
            <span className={`login-strength-label ${strength}`}>
              密码强度：{strengthCfg.label}
            </span>
          )}
        </div>
      </div>

      {/* 确认密码 */}
      <div className="login-field">
        <div className="login-input-wrap">
          <input
            id="reg-confirm"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            placeholder=" "
            className={`login-input login-input-with-icon ${form.formState.errors.confirmPassword ? "error" : ""}`}
            {...form.register("confirmPassword", {
              required: "请再次输入密码",
            })}
          />
          <label htmlFor="reg-confirm" className="login-input-label-float">
            确认密码
          </label>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowConfirm((v) => !v)}
            className="login-eye-btn"
            aria-label={showConfirm ? "隐藏确认密码" : "显示确认密码"}
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <FieldError msg={form.formState.errors.confirmPassword?.message} />
      </div>

      {/* 注册协议 */}
      <p className="login-agree-row login-agree-row--separate">
        注册即表示同意{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); toast.info("服务条款"); }}>
          服务条款
        </a>{" "}
        和{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); toast.info("隐私政策"); }}>
          隐私政策
        </a>
      </p>

      {/* 提交按钮 */}
      <button
        ref={btnRef}
        type="submit"
        disabled={isLoading}
        className="login-submit-btn"
        onClick={addRipple}
      >
        {isLoading ? (
          <span className="btn-spinner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" aria-hidden>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            正在创建账户...
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
              创建账户
            </span>
          </>
        )}
      </button>
    </form>
  );
}
