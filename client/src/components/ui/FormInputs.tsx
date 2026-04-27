import { useId } from "react";
import { Eye, EyeOff } from "lucide-react";

interface FormInputProps {
  label: string;
  icon?: React.ReactNode;
  value: string | number | undefined;
  onChange: (v: string | number) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
}

export function FormInput({
  label,
  icon,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  required,
  disabled,
}: FormInputProps) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-(--app-text-secondary)">
        {icon}
        {label}
        {required && <span className="text-(--app-danger)">*</span>}
      </label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(type === "number" ? parseInt(e.target.value) || 0 : e.target.value)}
        className="w-full rounded-xl border border-(--app-border) bg-(--app-surface) px-3.5 py-2.5 text-sm text-(--app-text-primary) shadow-sm transition-all placeholder:text-(--app-text-muted) focus:border-transparent focus:outline-none focus:ring-2 focus:ring-(--app-primary)/25 disabled:cursor-not-allowed disabled:bg-(--app-surface-raised) disabled:text-(--app-text-muted)"
        placeholder={placeholder}
        disabled={disabled}
      />
      {hint && <p className="mt-1 text-xs text-(--app-text-muted)">{hint}</p>}
    </div>
  );
}

interface PasswordInputProps {
  label: string;
  icon?: React.ReactNode;
  value: string | undefined;
  onChange: (v: string) => void;
  showPassword: boolean;
  onToggle: () => void;
  hint?: string;
  required?: boolean;
  placeholder?: string;
}

export function PasswordInput({
  label,
  icon,
  value,
  onChange,
  showPassword,
  onToggle,
  hint,
  required,
  placeholder = "••••••••",
}: PasswordInputProps) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-(--app-text-secondary)">
        {icon}
        {label}
        {required && <span className="text-(--app-danger)">*</span>}
      </label>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-(--app-border) bg-(--app-surface) px-3.5 py-2.5 pr-10 text-sm text-(--app-text-primary) shadow-sm transition-all placeholder:text-(--app-text-muted) focus:border-transparent focus:outline-none focus:ring-2 focus:ring-(--app-primary)/25"
          placeholder={placeholder}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-(--app-text-muted) transition-colors hover:text-(--app-text-secondary)"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-(--app-text-muted)">{hint}</p>}
    </div>
  );
}

interface ToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  id,
}: ToggleSwitchProps) {
  const autoId = useId();
  const switchId = id ?? autoId;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-(--app-border) bg-(--app-surface) px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-(--app-text-primary)">{label}</p>
        {description && <p className="mt-0.5 text-xs text-(--app-text-secondary)">{description}</p>}
      </div>
      <label className="relative inline-flex cursor-pointer items-center" htmlFor={switchId}>
        <input
          type="checkbox"
          id={switchId}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div className="h-6 w-11 rounded-full bg-(--app-border) transition-all peer-checked:bg-linear-to-r peer-checked:from-(--app-primary) peer-checked:to-(--app-accent) peer-focus:ring-2 peer-focus:ring-(--app-primary)/25 peer-focus:ring-offset-2" />
        <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all peer-checked:translate-x-5" />
      </label>
    </div>
  );
}
