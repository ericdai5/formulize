import React from "react";

import { LucideIcon } from "lucide-react";

interface IconButtonProps {
  icon: LucideIcon;
  alt: string;
  onClick: () => void;
  title?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  alt,
  onClick,
  title,
  className = "",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const iconSizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <button
      onClick={onClick}
      className={`bg-white border border-slate-200 ${sizeClasses[size]} rounded-xl flex items-center justify-center shadow-sm hover:shadow-md hover:bg-slate-50 hover:scale-105 transition-all duration-100 ${className}`}
      title={title}
      aria-label={alt}
    >
      <Icon
        className={`${iconSizeClasses[size]} text-slate-700 hover:text-slate-950 transition-colors duration-100`}
        strokeWidth={1.5}
      />
    </button>
  );
};

export default IconButton;
