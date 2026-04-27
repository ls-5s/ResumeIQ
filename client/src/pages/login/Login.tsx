import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLoginStore } from "../../store/Login";
import toast from "../../utils/toast";
import { LoginForm, RegisterForm } from "../../components/login";
import { CheckCircle2 } from "lucide-react";

const FEATURES = [
  "智能解析简历，快速提取关键信息",
  "多维度匹配岗位，提升筛选精准度",
  "批量处理候选人，节省招聘时间",
  "数据安全可控，助力合规招聘流程",
];

const STATS = [
  { value: "10K+", label: "已处理简历" },
  { value: "98.6%", label: "匹配准确率" },
  { value: "3.2x", label: "效率提升" },
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [animKey, setAnimKey] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useLoginStore();

  useEffect(() => {
    if (token) navigate("/app", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    if (searchParams.get("redirect") === "unauthorized") {
      toast.error("请先登录后再访问");
    }
  }, [searchParams]);

  const handleSwitchTab = (val: boolean) => {
    if (val === isLogin) return;
    setAnimKey((k) => k + 1);
    setIsLogin(val);
  };

  // 切换到登录：表单从左侧滑入；切换到注册：表单从右侧滑入
  const enterFromLeft = isLogin;

  return (
    <div className="login-root">
      {/* 精致圆点背景 */}
      <div className="login-grid-bg" aria-hidden />

      {/* 主卡片 */}
      <div className="login-card">
        {/* ── 左侧品牌区 ── */}
        <aside className="login-brand">
          <div className="login-brand-inner">
            {/* Logo */}
            <div className="login-brand-logo">
              <div className="login-logo-icon">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="login-brand-name">AI Resume Screening</span>
            </div>

            {/* 标题 */}
            <div className="login-brand-headline">
              <h1>
                用 AI 重新定义
                <br />
                简历筛选体验
              </h1>
              <p>智能解析 · 精准匹配 · 高效协同，让每一份人才都被认真对待</p>
            </div>

            {/* 特性列表 */}
            <ul className="login-features">
              {FEATURES.map((text) => (
                <li key={text} className="login-feature-item">
                  <div className="login-feature-icon">
                    <CheckCircle2 size={11} color="rgba(255,255,255,0.9)" aria-hidden />
                  </div>
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            {/* 统计数据 */}
            <div className="login-stats">
              {STATS.map((s) => (
                <div key={s.label} className="login-stat-item">
                  <span className="login-stat-value">{s.value}</span>
                  <span className="login-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 底部版权 */}
          <p className="login-brand-footer">
            © {new Date().getFullYear()} AI Resume Screening
          </p>
        </aside>

        {/* ── 右侧表单区 ── */}
        <div className="login-form-panel">
          {/* Tab 切换器（滑动指示器） */}
          <div className="login-tab-nav" role="tablist" aria-label="登录方式">
            <div
              className="login-tab-slider"
              data-pos={isLogin ? "left" : "right"}
              aria-hidden
            />
            <button
              role="tab"
              aria-selected={isLogin ? "true" : "false"}
              tabIndex={isLogin ? 0 : -1}
              onClick={() => handleSwitchTab(true)}
              className={`login-tab-item ${isLogin ? "login-tab-active" : ""}`}
            >
              登录
            </button>
            <button
              role="tab"
              aria-selected={!isLogin ? "true" : "false"}
              tabIndex={!isLogin ? 0 : -1}
              onClick={() => handleSwitchTab(false)}
              className={`login-tab-item ${!isLogin ? "login-tab-active" : ""}`}
            >
              注册
            </button>
          </div>

          {/* 表单区域（带滑入动画） */}
          <div className="login-form-area">
            {isLogin ? (
              <div
                key={`login-${animKey}`}
                className={`login-form-card ${enterFromLeft ? "entering-from-left" : "entering"}`}
              >
                <LoginForm />
              </div>
            ) : (
              <div
                key={`register-${animKey}`}
                className={`login-form-card ${enterFromLeft ? "entering" : "entering-from-left"}`}
              >
                <RegisterForm onSuccess={() => handleSwitchTab(true)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
