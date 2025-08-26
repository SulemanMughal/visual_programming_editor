
interface UploadedFile {
  id: number;
  name: string;
  file: string;
  content_type: string;
  file_size: number;
  created_at: string;
}


export type {
    UploadedFile
}