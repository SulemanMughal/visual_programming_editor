import { ReactNode } from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: ReactNode;
  // isAuthenticated?: boolean;
  // onLogout?: () => void;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Navbar />
      <main className="pt-16">{children}</main> {/* pt-16 to offset navbar height */}
    </div>
  );
}
