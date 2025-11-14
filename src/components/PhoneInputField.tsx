"use client";

import React from "react";
import PhoneInput, { type Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";

type Props = {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  after?: React.ReactNode;
  disabled?: boolean;
  defaultCountry?: Country;
};

export function PhoneInputField({
  id,
  value,
  onChange,
  error,
  after,
  disabled,
  defaultCountry = "ID",
}: Props) {
  return (
    <div className="space-y-1">
      <div
        className={[
          "rounded-xl border-2 px-3 py-2.5 flex items-center",
          error
            ? "border-red-400 focus-within:border-red-500"
            : "border-gray-200 focus-within:border-blue-500",
          "shadow-sm hover:shadow-md transition-all",
        ].join(" ")}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <PhoneInput
            id={id}
            value={value || undefined}
            onChange={(v) => onChange(v || "")}
            placeholder="Masukkan nomor telepon"
            defaultCountry={defaultCountry}
            international
            countryCallingCodeEditable={false}
            smartCaret={false}
            disabled={disabled}
            className="w-full"
            style={
              {
                "--PhoneInput-color--focus": "#3b82f6",
                "--PhoneInputCountrySelect-marginRight": "0.5rem",
              } as React.CSSProperties
            }
          />
        </div>
        {after ? (
          <div style={{ marginLeft: 8, display: "flex", alignItems: "center" }}>
            {after}
          </div>
        ) : null}
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <style jsx global>{`
        .PhoneInput {
          display: flex;
          align-items: center;
          width: 100%;
        }
        .PhoneInputCountry {
          margin-right: 0.5rem;
          display: flex;
          align-items: center;
        }
        .PhoneInputCountrySelect {
          border: none;
          background: transparent;
          font-size: 0.875rem;
          color: #374151;
          cursor: pointer;
        }
        .PhoneInputCountryIcon {
          width: 1.5rem;
          height: 1rem;
          border-radius: 0.25rem;
        }
        .PhoneInputCountryIcon--square {
          border-radius: 0.25rem;
        }
        .PhoneInputInput {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.95rem;
          color: #111827;
          padding: 0;
          margin: 0;
        }
        .PhoneInputInput::placeholder {
          color: #9ca3af;
        }
        .PhoneInputInput:focus {
          outline: none;
        }
        .PhoneInput * {
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
