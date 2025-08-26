interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export default function Button({ children, loading, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={loading}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center transition-all duration-300 transform hover:scale-105"
    >
      {loading && <span className="loader mr-2"></span>}
      {children}
    </button>
  );
}
