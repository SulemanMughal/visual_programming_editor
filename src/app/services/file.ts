import http from './http';


export const uploadJson = async (file: File) => {
	const formData = new FormData();
	formData.append('file', file);
	const response = await http.post('/upload-json/', formData, {
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	});
	return response.data;
};

// List all uploaded files
export const listFiles = async () => {
	const response = await http.get('/files/');
	return response.data;
};

// Get data for a given file id
export const getFileData = async (fileId: number) => {
	const response = await http.get(`/files/${fileId}/`);
	return response.data;
};
