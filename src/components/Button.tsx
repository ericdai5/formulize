import React from "react";

interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "success" | "warning" | "danger";
  icon: string;
  children: React.ReactNode;
  px?: "px-3" | "px-4";
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  disabled = false,
  variant = "primary",
  icon,
  children,
  px = "px-3",
}) => {
  const variantClasses = {
    primary: "bg-slate-50 hover:bg-slate-100 border-slate-200",
    secondary: "bg-slate-200 hover:bg-gray-300 border-slate-400",
    success: "bg-green-500 hover:bg-green-600",
    warning: "bg-yellow-500 hover:bg-yellow-600",
    danger: "bg-red-400 hover:bg-red-500 border-red-500",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variantClasses[variant]} ${px} py-2 rounded-xl border disabled:bg-gray-200 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center`}
    >
      <span className="mr-2">{icon}</span>
      {children}
    </button>
  );
};

export default Button;
