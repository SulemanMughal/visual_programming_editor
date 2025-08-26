
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


function Sidebar() {
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [jsonData, setJsonData] = useState(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<number|null>(null);
  const [selectedFileData, setSelectedFileData] = useState<object|null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
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
        notifyError(err.response?.data?.message || 'Upload failed!');
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
    <aside className="h-full w-72 shrink-0 border-r border-neutral-800/70 bg-neutral-950 p-3">
      <div className="flex flex-col gap-4">
        <SidebarSearch value={query} onChange={setQuery} />

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
            <SidebarList items={files} filter={query} />
          </div>
        </SidebarSection>

        <div className="h-px w-full bg-neutral-800/70" />

        <SidebarSection title="Fields" defaultOpen>
          <div className="mt-2">
            {/* <SidebarList items={FIELDS} filter={query} /> */}
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