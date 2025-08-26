"use client"

// import { useEffect, useState } from 'react';
import { useMemo, useState, useCallback, useEffect } from "react";

import Select from 'react-select';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';


import JsonFileUploader from "@/app/components/JsonFileUploader";
import JsonCheckboxTree from "@/app/components/JsonCheckboxTree";
import JsonTreeGrid from "@/app/components/JsonTreeGrid";
import JsonTreeGridVirtSearch from "@/app/components/JsonTreeGridVirtSearch";
import JsonTreeGridVirtButton from "@/app/components/JsonTreeGridVirtButton";
import JsonTreeGridVirtActionButton from "@/app/components/JsonTreeGridVirtActionButton";
import JsonTreeGridVirtActionKey from "@/app/components/JsonTreeGridVirtActionKey";
import ClickedKeysPanel, { ClickItem } from "@/app/components/ClickedKeysPanel";


import { notifyError, notifySuccess } from '../utils/toast';
import { ToastContainer } from 'react-toastify';



interface UploadedFile {
  id: number;
  name: string;
  file: string;
  content_type: string;
  file_size: number;
  created_at: string;
}

import { uploadJson, listFiles, getFileData } from '../services/file';
// import { toast } from 'react-toastify';
export default function Page() {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [jsonData, setJsonData] = useState(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<number|null>(null);
  const [selectedFileData, setSelectedFileData] = useState<object|null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
    const [clicked, setClicked] = useState<Map<string, ClickItem>>(new Map());


  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch uploaded files
  useEffect(() => {
    const fetchFiles = async () => {
      setLoadingFiles(true);
      try {
        const res = await listFiles();
        setFiles(res.data || []);
      } catch (err) {
        setFiles([]);
      } finally {
        setLoadingFiles(false);
      }
    };
    fetchFiles();
  }, []);

  const handleUpload = async (file: File) => {
    try {
      const result = await uploadJson(file);
      setJsonData(result);
      // Optionally refresh file list after upload
      const res = await listFiles();
      setFiles(res.data || []);
      // console.log('Upload result:', result);
      handleFileSelect(result.id);
    } catch (err) {
      // console.error('Upload failed:', err);
      // notifyError('Failed to load file data.');
      notifyError(err.response?.data?.message || 'Upload failed!');
    }
  };

  // Handle file card selection
  const handleFileSelect = async (fileId: number) => {
    setSelectedFileId(fileId);
    try {
      const res = await getFileData(fileId);
      setSelectedFileData(res.data);
      notifySuccess('File data loaded successfully!');
    } catch {
      setSelectedFileData(null);
      notifyError('Failed to load file data.');
    }
  };

  const handleAction = useCallback(
    ({ id, path, node }: { id: string; path: string[]; node: any }) => {
      setClicked((prev) => {
        const next = new Map(prev);
        const existing = next.get(id);
        if (existing) {
          next.set(id, { ...existing, count: existing.count + 1 });
        } else {
          next.set(id, { id, name: node.name, path, count: 1 });
        }
        return next;
      });
    },
    []
  );

  const removeKey = useCallback((id: string) => {
    setClicked((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setClicked(new Map()), []);

  const items = useMemo(() => Array.from(clicked.values()), [clicked]);


  return (
    <>
    <ToastContainer />
    
    <div className="p-4">
  <div className="flex flex-col md:flex-row ">
    
    <div className="h-auto md:flex-[2]  border border-gray-200  shadow-sm">

        <ClickedKeysPanel items={items} onRemove={removeKey} onClear={clearAll} />

    </div>


{/* Left Panel */}
    <div className=" md:flex-[1]  border border-gray-200  shadow-sm">

<div className="space-y-0">
        
        <details className="group  border border-gray-200">
          <summary className="flex items-center justify-between cursor-pointer p-3  group-open:bg-gray-500 group-open:rounded-none">
            <span className="text-sm font-medium text-white">Datasets</span>
            <svg className="w-4 h-4 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.127l3.71-3.896a.75.75 0 111.08 1.04l-4.24 4.46a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
            </svg>
          </summary>
          <div className="px-3 pb-3 text-sm text-gray-600 space-y-2">
            {/* Upload Json File  */}

            <div className='my-4'>
              <JsonFileUploader onFileUpload={handleUpload} />
            </div>

            {/* List Down Datasets */}
            <div>
            {loadingFiles ? (
              <div className="text-gray-500">Loading files...</div>
            ) : files.length === 0 ? (
              <div className="text-gray-400">No files uploaded yet.</div>
            ) : (
              <div className="mb-4">
                <Select
                  options={files.map(file => ({
                    value: file.id,
                    label: `${file.name} (${Math.round(file.file_size/1024)} KB • ${new Date(file.created_at).toLocaleString()})`,
                  }))}
                  value={files
                    .filter(file => file.id === selectedFileId)
                    .map(file => ({
                      value: file.id,
                      label: `${file.name} (${Math.round(file.file_size/1024)} KB • ${new Date(file.created_at).toLocaleString()})`,
                    }))[0] || null}
                  onChange={option => {
                    if (option) {
                      handleFileSelect(option.value);
                      setSelectedFileId(option.value);
                    } else {
                      setSelectedFileId(null);
                    }
                  }}
                  isClearable
                  placeholder="Search and select a dataset..."
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({ ...base, backgroundColor: '#374151', color: 'white', borderColor: '#3b82f6' }),
                    input: (base) => ({ ...base, color: 'white' }),
                    singleValue: (base) => ({ ...base, color: 'white' }),
                    menu: (base) => ({ ...base, backgroundColor: '#374151', color: 'white' }),
                    option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#3b82f6' : '#374151', color: 'white' }),
                  }}
                />
              </div>
            )}
            </div>
          </div>
        </details>

        
        <details className="group  border border-gray-200">
          <summary className="flex items-center justify-between cursor-pointer p-3  group-open:bg-gray-500">
            <span className="text-sm font-medium text-white">Fields</span>
            <svg className="w-4 h-4 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.127l3.71-3.896a.75.75 0 111.08 1.04l-4.24 4.46a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
            </svg>
          </summary>
          <div className="text-sm text-gray-600">
        <div className="w-full  bg-gray-900 rounded-lg ">
            {/* <JsonTreeGridVirtSearch json={selectedFileData} /> */}
                  <JsonTreeGridVirtActionKey json={selectedFileData} onAction={handleAction}  />

          </div>
          </div>
        </details>

        
        <details className="group rounded-none border border-gray-200">
          <summary className="flex items-center justify-between cursor-pointer p-3 rounded-none group-open:bg-gray-500">
            <span className="text-sm font-medium text-white">Functions</span>
            <svg className="w-4 h-4 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.127l3.71-3.896a.75.75 0 111.08 1.04l-4.24 4.46a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
            </svg>
          </summary>
          <div className="px-3 pb-3 text-sm text-gray-600">
            
          </div>
        </details>
      </div>



    </div>
  </div>
</div>

      
    </>
  );
}
