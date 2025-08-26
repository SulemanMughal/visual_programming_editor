
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

import IconAnd from "@/app/icons/IconAnd";
import IconOr from "@/app/icons/IconOr";
import IconNot from "@/app/icons/IconNot";
import IconPlus from "@/app/icons/IconPlus";
import IconInfo from "@/app/icons/IconInfo";
import IconMinus from "@/app/icons/IconMinus";
import IconMultiply from "@/app/icons/IconMultiply";
import IconDivide from "@/app/icons/IconDivide";
import IconEqual from "@/app/icons/IconEqual";
import IconNotEqual from "@/app/icons/IconNotEqual";
import IconGreaterThan from "@/app/icons/IconGreaterThan";
import IconLessThan from "@/app/icons/IconLessThan";
import IconEdit from "@/app/icons/IconEdit";
import IconX from "@/app/icons/IconX";


// Operator List
const arithmeticOperatorList = [
  { id: 1, name: "Add", description: "Adds two numbers" , icon : <IconPlus />},
  { id: 2, name: "Subtract", description: "Subtracts one number from another" , icon : <IconMinus />},
  { id: 3, name: "Multiply", description: "Multiplies two numbers" , icon : <IconMultiply />},
  { id: 4, name: "Divide", description: "Divides one number by another" , icon : <IconDivide />},
]

const comparisonOperatorList = [
  { id: 1, name: "Equal", description: "Checks if two values are equal" , icon : <IconEqual />},
  { id: 2, name: "Not Equal", description: "Checks if two values are not equal" , icon : <IconNotEqual />},
  { id: 3, name: "Greater Than", description: "Checks if one value is greater than another" , icon : <IconGreaterThan />},
  { id: 4, name: "Less Than", description: "Checks if one value is less than another" , icon : <IconLessThan />},
]

const logicalOperatorList = [
  { id: 1, name: "And", description: "Logical AND operator" , icon : <IconAnd />},
  { id: 2, name: "Or", description: "Logical OR operator" , icon : <IconOr />},
  { id: 3, name: "Not", description: "Logical NOT operator" , icon : <IconNot />},
]

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

        {/* Arithmetic Operators */}
        <SidebarSection title="Arithmetic Operators" >
          <div className="mt-2">
            <SidebarList items={arithmeticOperatorList} filter={query} />
          </div>
        </SidebarSection>

        {/* Comparison Operators */}
        <SidebarSection title="Comparison Operators" >
          <div className="mt-2">
            <SidebarList items={comparisonOperatorList} filter={query} />
          </div>
        </SidebarSection>

        {/* Logical Operators */}
        <SidebarSection title="Logical Operators" >
          <div className="mt-2">
            <SidebarList items={logicalOperatorList} filter={query} />
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