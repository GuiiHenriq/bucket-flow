interface ToastProps {
  message: string;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  return (
    <div className="fixed top-6 right-6 z-50 bg-red-500 text-white px-6 py-3 rounded shadow-lg flex items-center animate-fade-in">
      <span className="mr-4">{message}</span>
      <button onClick={onClose} className="ml-2 text-white font-bold">×</button>
    </div>
  );
}