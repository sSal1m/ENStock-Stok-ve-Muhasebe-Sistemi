"use client";

import { useEffect } from "react";

export interface ToastProps {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  onClose?: () => void;
}

export default function Toast({ id, type, title, message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-error-container border-error/20";
      case "warning":
        return "bg-orange-50 border-orange-200";
      case "info":
        return "bg-secondary-container border-secondary/20";
      default:
        return "bg-surface-container-lowest border-outline-variant/15";
    }
  };

  const getIconColor = () => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-700";
      case "error":
        return "bg-error-container text-error";
      case "warning":
        return "bg-orange-100 text-orange-700";
      case "info":
        return "bg-secondary-container text-secondary";
      default:
        return "bg-secondary-container text-secondary";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "check_circle";
      case "error":
        return "error";
      case "warning":
        return "warning";
      case "info":
        return "info";
      default:
        return "info";
    }
  };

  return (
    <div className={`flex items-start gap-3 px-6 py-4 rounded-xl shadow-lg border ${getBackgroundColor()} animate-in fade-in slide-in-from-top-2 duration-300`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getIconColor()}`}>
        <span className="material-symbols-outlined text-lg">{getIcon()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-headline font-bold text-sm text-on-surface">{title}</p>
        <p className="text-xs text-on-surface-variant">{message}</p>
      </div>
      <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface shrink-0">
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
}
