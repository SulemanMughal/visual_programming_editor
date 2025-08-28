
import {useState, useEffect} from "react"
import { UploadedFile } from '@/app/utils/interfaces/uploadedFile.interface';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

import { uploadJson, listFiles, getFileData } from '@/app/services/file';

import { notifyError, notifySuccess } from '@/app/utils/toast';

import SidebarSearch from "./SidebarSearch"

import SidebarSection from "./SidebarSection"

import ToolbarIconButton from "./ToolbarIconButton"

import FieldsTree from "./FieldsTree"

import {Modal} from "@/app/components/Modal/Modal"

import JsonFileUploader from "@/app/components/JsonFileUploader"

import SidebarList from "./SidebarList"

import IconPlus from "@/app/icons/IconPlus";
import IconInfo from "@/app/icons/IconInfo";
import IconEdit from "@/app/icons/IconEdit";
import IconX from "@/app/icons/IconX";

import {
  OPS,
  LOGICAL_OPERATORS,
  CONTROL_OPERATORS,
  LOOP_OPERATORS,
  OTHER_OPERATORS,
  LIST_OPERATORS,
  BOOLEAN_OPERATORS
} from "./constants"


import PaletteItem from "./PaletteItem"

function Sidebar() {
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [, setJsonData] = useState(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [, setSelectedFileId] = useState<number|null>(null);
  const [selectedFileData, setSelectedFileData] = useState<object|null>(null);
  const [, setLoadingFiles] = useState(false);
  const router = useRouter();
    const { isAuthenticated } = useAuth();
  
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
        interface UploadError {
          response?: {
            data?: {
              message?: string;
            };
          };
        }
        const errorObj = err as UploadError;
        notifyError(
          typeof err === 'object' && err !== null && 'response' in err && errorObj.response?.data?.message
            ? errorObj.response.data.message
            : 'Upload failed!'
        );
      } finally{
        setModalOpen(false);
      }
    };


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

  return (
    <aside className="max-h-[calc(100vh-90px)] h-[calc(100vh-90px)] overflow-auto w-72 shrink-0 border-r border-neutral-800/70 bg-neutral-950 p-3">
      <div className="flex flex-col gap-4">
        <SidebarSearch value={query} onChange={setQuery} />

        {/* Arithmetic Operators */}
        <SidebarSection title="Arithmetic Operators" >
          <div className="mt-2 flex w-full items-center justify-start flex-wrap gap-2">
            {Object.values(OPS).map((op) => (
              <PaletteItem key={op.id} type="operator" label={op.label} payload={{ opId: op.id }} />
            ))}
          </div>
        </SidebarSection>

        {/* Comparison Operators */}
        <SidebarSection title="Comparison Operators" >
          <div className="mt-2 flex w-full items-center justify-start flex-wrap gap-2">
            {Object.values(LOGICAL_OPERATORS).map((op) => (
              <PaletteItem key={op.id} type="operator" label={op.label} payload={{ opId: op.id }} />
            ))}
          </div>
        </SidebarSection>

        {/* Control Operators */}
        <SidebarSection title="Control Operators" >
          <div className="mt-2 flex w-full items-center justify-start flex-wrap gap-2">
            {Object.values(CONTROL_OPERATORS).map((op) => (
              <PaletteItem key={op.id} type="operator" label={op.label} payload={{ opId: op.id }} />
            ))}
          </div>
        </SidebarSection>

        {/* Boolean Operators */}
        <SidebarSection title="Boolean Operators" >
          <div className="mt-2 flex w-full items-center justify-start flex-wrap gap-2">
            {Object.values(BOOLEAN_OPERATORS).map((op) => (
              <PaletteItem key={op.id} type="operator" label={op.label} payload={{ opId: op.id }} />
            ))}
          </div>
        </SidebarSection>
        
        
        {/* Loop Operators */}
        <SidebarSection title="Loop Operators" >
          <div className="mt-2 flex w-full items-center justify-start flex-wrap gap-2">
            {Object.values(LOOP_OPERATORS).map((op) => (
              <PaletteItem key={op.id} type="operator" label={op.label} payload={{ opId: op.id }} />
            ))}
          </div>
        </SidebarSection>
        
        
        {/* Other Operators */}
        <SidebarSection title="Other Operators" >
          <div className="mt-2 flex w-full items-center justify-start flex-wrap gap-2">
            {Object.values(OTHER_OPERATORS).map((op) => (
              <PaletteItem key={op.id} type="operator" label={op.label} payload={{ opId: op.id }} />
            ))}
          </div>
        </SidebarSection>
        
        
        {/* List Operators */}
        <SidebarSection title="List Operators" >
          <div className="mt-2 flex w-full items-center justify-start flex-wrap gap-2">
            {Object.values(LIST_OPERATORS).map((op) => (
              <PaletteItem key={op.id} type="operator" label={op.label} payload={{ opId: op.id }} />
            ))}
          </div>
        </SidebarSection>


        {/* Constants */}
        <SidebarSection title="Constants" >
          <div className="mt-2 flex w-full items-center justify-start flex-wrap gap-2">
            {[{ label: "Number", dtype: "number", value: 0 }, { label: "String", dtype: "string", value: "" }, { label: "True", dtype: "boolean", value: true }, { label: "False", dtype: "boolean", value: false }].map((c) => (
            <PaletteItem key={c.label} type="const" label={c.label} payload={c} />
          ))}
          </div>
        </SidebarSection>

        <SidebarSection title="Sinks" >
          <div className="mt-2 flex w-full items-center justify-start flex-wrap gap-2">
            <PaletteItem type="output" label="Output" payload={{ label: "Result" }} />
          </div>
        </SidebarSection>

        <SidebarSection
          title="Datasets"
          actions={
            <div className="flex items-center gap-1">
              <ToolbarIconButton title="New dataset" onClick={() => setModalOpen(true)}>
                <IconPlus />
              </ToolbarIconButton>
              <ToolbarIconButton title="Info">
                <IconInfo />
              </ToolbarIconButton>
              <ToolbarIconButton title="Edit">
                <IconEdit />
              </ToolbarIconButton>
              <ToolbarIconButton title="Remove">
                <IconX />
              </ToolbarIconButton>
            </div>
          }
        >
          <div className="mt-2">
            <SidebarList items={files} filter={query} showDeleteBtn={true} />
          </div>
        </SidebarSection>

        <div className="h-px w-full bg-neutral-800/70" />

        <SidebarSection title="Fields" >
          <div className="mt-2">
            <FieldsTree data={selectedFileData} filter={query} />
          </div>
        </SidebarSection>

        
        
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <h2 className="text-lg font-bold mb-4 text-white">Upload JSON File</h2>
        <div className='my-4'>
          <JsonFileUploader onFileUpload={handleUpload} />
        </div>
      </Modal>
    </aside>
  );
}


export default Sidebar;