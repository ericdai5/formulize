import React from "react";

interface IconButtonProps {
  icon: string;
  alt: string;
  onClick: () => void;
  title?: string;
  className?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
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
    >
      <img src={icon} alt={alt} className="w-4 h-4" />
    </button>
  );
};

export default IconButton;
