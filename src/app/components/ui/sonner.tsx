"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#09090b",
          "--normal-border": "#e4e4e7",
          "--success-bg": "#f0fdf4",
          "--success-text": "#15803d",
          "--success-border": "#86efac",
          "--error-bg": "#fef2f2",
          "--error-text": "#b91c1c",
          "--error-border": "#fca5a5",
          "--warning-bg": "#fffbeb",
          "--warning-text": "#b45309",
          "--warning-border": "#fcd34d",
        } as React.CSSProperties
      }
      toastOptions={{
        style: {
          background: '#ffffff',
          color: '#09090b',
          border: '1px solid #e4e4e7',
        },
        className: 'shadow-lg',
      }}
      {...props}
    />
  );
};

export { Toaster };