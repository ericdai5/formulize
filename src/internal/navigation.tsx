import React, { useState } from "react";

import { Menu } from "lucide-react";

interface HeaderProps {
  viewMode: "editor" | "formulizeAPI";
  setViewMode: (mode: "editor" | "formulizeAPI") => void;
}

const Header: React.FC<HeaderProps> = ({ viewMode, setViewMode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Toggle Button - positioned at top left */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-4 z-50 bg-white rounded-r-xl p-2 border-t border-r border-b border-gray-200 hover:bg-gray-50 transition-all duration-300 ${
          isOpen ? "left-64" : "left-0"
        }`}
        aria-label="Toggle sidebar"
      >
        <Menu className="w-4 h-4 text-gray-700" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-white shadow-xl border-r border-gray-200 z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } w-64`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">Formulize</h1>
          </div>
          <div className="space-y-1">
            <button
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                viewMode === "editor"
                  ? "bg-slate-100 text-slate-900"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => {
                setViewMode("editor");
                setIsOpen(false);
              }}
            >
              Editor
            </button>
            <button
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                viewMode === "formulizeAPI"
                  ? "bg-slate-100 text-slate-900"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => {
                setViewMode("formulizeAPI");
                setIsOpen(false);
              }}
            >
              API Playground
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
