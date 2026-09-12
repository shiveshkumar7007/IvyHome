import { createContext, useContext, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex animate-bounce items-center gap-3 rounded-xl bg-[#1E2022] px-5 py-3 text-sm font-semibold text-white shadow-2xl">
          {toast.type === "success" ? (
            <CheckCircle size={20} className="text-green-400" />
          ) : (
            <XCircle size={20} className="text-red-400" />
          )}
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
};