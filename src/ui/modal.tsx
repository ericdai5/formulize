import React from "react";
import { X } from "lucide-react";

import IconButton from "./icon-button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-4xl",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div
        className={`relative bg-white rounded-lg shadow-xl ${maxWidth} w-full mx-4 max-h-[80vh] overflow-hidden`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          {title && <h2 className="text-lg">{title}</h2>}
          <IconButton
            icon={X}
            alt="Close"
            onClick={onClose}
            className="ml-auto"
          />
        </div>
        <div className="max-h-[calc(80vh-4rem)] overflow-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
