"use client"; // if using Next.js 13+ with app router

import { useState, useRef } from "react";

const JsonFileUploader = ({ onFileUpload }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const MAX_SIZE_MB = 25;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;

    if (selectedFile.type !== "application/json") {
      setError("Only JSON files are allowed.");
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_SIZE_BYTES) {
      setError(`File size must be less than ${MAX_SIZE_MB} MB.`);
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError("");
    if (onFileUpload) onFileUpload(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-dashed border-2 border-gray-400 rounded p-8 text-center cursor-pointer hover:bg-gray-500 transition"
        onClick={() => fileInputRef.current.click()}
      >
        {file ? (
          <p className="text-green-600">Uploaded: {file.name}</p>
        ) : (
          <p className="text-white">Drag & drop a JSON file here, or click to select</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>
      {error && <p className="text-red-600 mt-2">{error}</p>}
      {/* {file && (
        <button
          type="button"
          onClick={handleRemoveFile}
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          Remove File
        </button>
      )} */}
    </div>
  );
};

export default JsonFileUploader;
