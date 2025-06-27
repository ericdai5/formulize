import React from "react";

interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  icon: string | React.ComponentType<{ className?: string }>;
  iconAlt?: string;
  children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  disabled = false,
  variant = "primary",
  icon,
  iconAlt = "",
  children,
}) => {
  const variantClasses = {
    primary: "bg-white hover:bg-slate-50 border-slate-200",
    secondary: "bg-slate-200 hover:bg-gray-300 border-slate-400",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variantClasses[variant]} px-2.5 py-2 rounded-xl border disabled:bg-gray-200 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center gap-1.5 text-base/none`}
    >
      {typeof icon === "string" ? (
        <img src={icon} alt={iconAlt} className="w-4 h-4" />
      ) : (
        React.createElement(icon, { className: "w-4 h-4" })
      )}
      {children}
    </button>
  );
};

export default Button;
