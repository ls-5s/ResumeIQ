import { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useLoginStore } from "../store/Login";
import { getProfile } from "../api/profile";

interface UserInfoProps {
  username?: string;
  /** 侧边栏收起时仅显示头像（退出需展开侧栏） */
  compact?: boolean;
}

export function UserInfo({
  username: propsUsername,
  compact = false,
}: UserInfoProps) {
  const logout = useLoginStore((state) => state.logout);
  const user = useLoginStore((state) => state.user);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile();
        setAvatar(data.avatar);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };
    fetchProfile();
  }, []);

  const displayUsername = propsUsername || user?.username || "用户";
  const displayAvatar = avatar || user?.avatar || null;

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const avatarBlock = (
    <div className="h-9 w-9 shrink-0 rounded-full bg-linear-to-br from-[#0ea5e9] to-[#3b82f6] p-[2px]">
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-(--app-surface)">
        {displayAvatar ? (
          <img
            src={displayAvatar}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="bg-linear-to-br from-[#0ea5e9] to-[#3b82f6] bg-clip-text text-[13px] font-semibold text-transparent">
            {displayUsername.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );

  const logoutButtonClass =
    "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border-none bg-transparent text-(--app-danger) transition-all duration-150 hover:bg-(--app-danger-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-sidebar-bg)";

  if (compact) {
    return (
      <div className="flex flex-col items-center">
        <Link
          to="/app/settings"
          title={displayUsername}
          aria-label={`账号设置：${displayUsername}`}
          className="flex cursor-pointer items-center justify-center rounded-[10px] border-none bg-transparent transition-all duration-150 hover:bg-(--app-sidebar-hover-bg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-sidebar-bg)"
        >
          {avatarBlock}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-1">
      <Link
        to="/app/settings"
        title="账号设置"
        aria-label={`账号设置：${displayUsername}`}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-[10px] bg-transparent px-3 py-2 no-underline transition-all duration-150 hover:bg-(--app-sidebar-hover-bg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-sidebar-bg)"
      >
        {avatarBlock}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-semibold leading-tight text-(--app-sidebar-text-primary)">
            {displayUsername}
          </span>
          <span className="text-[11px] leading-tight text-(--app-sidebar-text-muted)">
            管理员
          </span>
        </div>
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        title="退出登录"
        aria-label="退出登录"
        className={logoutButtonClass}
      >
        <LogOut className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
