import React from "react";

import { LucideIcon } from "lucide-react";

interface IconButtonProps {
  icon: LucideIcon;
  alt: string;
  onClick: () => void;
  title?: string;
  className?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  alt,
  onClick,
  title,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      className={`bg-white border border-slate-200 h-8 w-8 rounded-xl flex items-center justify-center shadow-sm hover:shadow-md hover:bg-slate-50 hover:scale-105 transition-all duration-100 ${className}`}
      title={title}
      aria-label={alt}
    >
      <Icon className="w-4 h-4 text-slate-700 hover:text-slate-950 transition-colors duration-100" />
    </button>
  );
};

export default IconButton;
