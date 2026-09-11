import { type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: ReactNode;
}

export function FormField({ label, required, error, help, children }: FieldProps) {
  return (
    <div>
      <label className="label-text">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {help && !error && <p className="mt-1 text-xs text-stone-500">{help}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input-field ${props.className ?? ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input-field ${props.className ?? ''}`} />;
}

export function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`input-field ${props.className ?? ''}`} />;
}
