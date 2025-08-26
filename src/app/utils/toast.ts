import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const notifySuccess = (msg: string) => toast.success(msg, { position: "top-right" });
export const notifyError = (msg: string) => toast.error(msg, { position: "top-right" });
