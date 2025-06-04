import React from "react";

interface HeaderProps {
  viewMode: "editor" | "formulizeAPI";
  setViewMode: (mode: "editor" | "formulizeAPI") => void;
}

const Header: React.FC<HeaderProps> = ({ viewMode, setViewMode }) => {
  return (
    <div className="bg-white text-black border-b border-gray-200 px-4 py-2 flex justify-between items-center">
      <h1>Formulize</h1>
      <div className="flex gap-1 border border-slate-200 rounded-full p-1">
        <button
          className={`px-4 py-1.5 rounded-full text-sm ${viewMode === "editor" ? "bg-slate-100" : "bg-white text-gray-700"}`}
          onClick={() => setViewMode("editor")}
        >
          Editor
        </button>
        <button
          className={`px-4 py-1.5 rounded-full text-sm ${viewMode === "formulizeAPI" ? "bg-slate-100" : "bg-white text-gray-700"}`}
          onClick={() => setViewMode("formulizeAPI")}
        >
          API Playground
        </button>
      </div>
    </div>
  );
};

export default Header;
