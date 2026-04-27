import {
  FileText,
  Bot,
  CheckCircle,
  X,
  Mail,
  type LucideIcon,
} from "lucide-react";
import type { Activity } from "../../../types/dashboard";

export const ACTIVITY_TYPE_CONFIG: Record<
  string,
  {
    icon: LucideIcon;
    ring: string;
    iconColor: string;
    text: string;
  }
> = {
  upload: {
    icon: FileText,
    ring: "ring-sky-500/25",
    iconColor: "text-sky-600",
    text: "上传了新简历",
  },
  screening: {
    icon: Bot,
    ring: "ring-blue-500/25",
    iconColor: "text-blue-600",
    text: "AI 筛选完成",
  },
  pass: {
    icon: CheckCircle,
    ring: "ring-emerald-500/25",
    iconColor: "text-emerald-600",
    text: "通过初筛",
  },
  reject: {
    icon: X,
    ring: "ring-red-500/25",
    iconColor: "text-red-600",
    text: "未通过筛选",
  },
  interview: {
    icon: Mail,
    ring: "ring-orange-500/25",
    iconColor: "text-orange-600",
    text: "邮件 / 面试相关操作",
  },
};

const KIND: Record<Activity["type"], string> = {
  upload: "简历入库",
  screening: "AI 评估",
  pass: "初筛通过",
  reject: "初筛未通过",
  interview: "邮件通知",
};

/** 左侧时间轴旁的简短分类，便于扫读 */
export function getActivityKindLabel(activity: Activity): string {
  if (
    activity.type === "reject" &&
    activity.description?.trim() === "删除了简历"
  ) {
    return "删除简历";
  }
  return KIND[activity.type] ?? "操作";
}

/**
 * 主标题：统一用「对象（候选人/简历）+ 动作」句式，避免歧义。
 * 说明：resumeName 存的是候选人/简历展示名，均指投递侧对象，非操作人。
 */
export function getActivityHeadline(activity: Activity): string {
  const desc = activity.description?.trim();
  const name = activity.resumeName?.trim();
  const hasName = Boolean(name);

  switch (activity.type) {
    case "upload": {
      // 邮箱导入、批量说明等已有完整描述时直接用
      if (
        desc &&
        (!hasName ||
          /导入|邮箱|份简历|附件/i.test(desc))
      ) {
        return desc;
      }
      if (hasName) {
        return `新简历已入库，候选人：${name}`;
      }
      return "新简历已入库（尚未识别或填写候选人姓名）";
    }
    case "screening": {
      if (hasName) {
        return `已对候选人「${name}」完成 AI 评估`;
      }
      if (desc) {
        const short =
          desc.length > 72 ? `${desc.slice(0, 72)}…` : desc;
        return `AI 评估已完成 · ${short}`;
      }
      return "已完成一次 AI 评估（未关联候选人姓名）";
    }
    case "pass": {
      if (hasName) {
        return `候选人「${name}」已标记为通过初筛`;
      }
      return "已有一条简历标记为「通过初筛」";
    }
    case "reject": {
      if (desc === "删除了简历") {
        if (hasName) {
          return `已从库中删除候选人「${name}」的简历`;
        }
        return "已从简历库删除一条记录";
      }
      if (hasName) {
        return `候选人「${name}」未通过初筛`;
      }
      if (desc) return desc;
      return "已有一条简历标记为「未通过初筛」";
    }
    case "interview": {
      return desc || "已向候选人发送邮件或通知";
    }
    default:
      return hasName ? `「${name}」相关操作` : "操作记录";
  }
}
