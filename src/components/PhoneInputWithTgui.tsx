"use client";

import React from "react";
import { Input } from "@telegram-apps/telegram-ui";
import PhoneInput, { type Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";

type Props = {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  header?: React.ReactNode;
  before?: React.ReactNode;
  after?: React.ReactNode;
  disabled?: boolean;
  placeholder?: string;
  defaultCountry?: Country;
};

export function PhoneInputWithTgui({
  id,
  value,
  onChange,
  error,
  header,
  before,
  after,
  disabled,
  placeholder = "Masukkan nomor telepon",
  defaultCountry = "ID",
}: Props) {
  const status: "default" | "error" | "focused" = error ? "error" : "default";
  const hasBefore = Boolean(before);
  const hasAfter = Boolean(after);
  const leftOffset = hasBefore ? 44 : 12;
  const rightOffset = hasAfter ? 48 : 12;

  return (
    <div style={{ position: "relative" }}>
      <Input
        id={id}
        value=""
        onChange={() => {}}
        readOnly
        header={header}
        status={status}
        before={before}
        after={after}
        disabled={disabled}
        placeholder=""
        style={{ background: "transparent" }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "stretch",
          pointerEvents: "none",
        }}
        aria-hidden={false}
      >
        <div
          style={{
            position: "absolute",
            left: leftOffset,
            right: rightOffset,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            pointerEvents: disabled ? "none" : "auto",
          }}
        >
          <PhoneInput
            id={id ? `${id}__phone` : undefined}
            value={value || undefined}
            onChange={(v) => onChange(v || "")}
            placeholder={placeholder}
            defaultCountry={defaultCountry}
            international
            countryCallingCodeEditable={false}
            smartCaret={false}
            className="w-full"
            style={
              {
                "--PhoneInput-color--focus":
                  "var(--tgui--accent_text_color, #3b82f6)",
                "--PhoneInputCountrySelect-marginRight": "0.5rem",
                width: "100%",
              } as React.CSSProperties
            }
          />
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 6,
            color: "var(--tgui--hint_color, #ef4444)",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

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
          color: var(--tgui--text_color, #374151);
          cursor: pointer;
        }
        .PhoneInputCountryIcon {
          width: 1.25rem;
          height: 0.875rem;
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
          color: var(--tgui--text_color, #111827);
          padding: 10px 0; /* align vertically inside Input */
          margin: 0;
        }
        .PhoneInputInput::placeholder {
          color: var(--tgui--hint_color, #9ca3af);
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
