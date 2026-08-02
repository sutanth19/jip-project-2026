import * as React from "react";
import {
  AlertCircle,
  Building2,
  Hash,
  ImagePlus,
  LoaderCircle,
  Mail,
  Phone,
  School,
  UserRound,
} from "lucide-react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  SchoolCreateFieldName,
  SchoolCreateValues,
} from "@/features/admin/utils/school-create";
import { schoolLogoMaxBytes } from "@/features/admin/utils/school-logo-upload";
import { cn } from "@/lib/utils";

type SchoolFormFieldConfig = {
  name: Exclude<SchoolCreateFieldName, "address" | "logo">;
  label: string;
  helper: string;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
  autoComplete: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  icon: React.ReactNode;
  uppercase?: boolean;
};

const schoolFormFields: SchoolFormFieldConfig[] = [
  {
    name: "schoolCode",
    label: "Kod Sekolah",
    helper: "Gunakan 2 hingga 30 aksara. Huruf, nombor, garis bawah dan tanda sempang sahaja.",
    required: true,
    autoComplete: "off",
    icon: <Hash className="size-5" aria-hidden="true" />,
    uppercase: true,
  },
  {
    name: "schoolName",
    label: "Nama Sekolah",
    helper: "Masukkan nama rasmi sekolah.",
    required: true,
    autoComplete: "organization",
    icon: <School className="size-5" aria-hidden="true" />,
  },
  {
    name: "principalName",
    label: "Nama Pengetua",
    helper: "Nama pengetua atau pegawai utama sekolah, jika tersedia.",
    autoComplete: "name",
    icon: <UserRound className="size-5" aria-hidden="true" />,
  },
  {
    name: "contactEmail",
    label: "E-mel Perhubungan",
    helper: "Alamat e-mel rasmi untuk urusan sekolah.",
    type: "email",
    autoComplete: "email",
    icon: <Mail className="size-5" aria-hidden="true" />,
  },
  {
    name: "phone",
    label: "Nombor Telefon",
    helper: "Nombor telefon rasmi sekolah.",
    required: true,
    type: "tel",
    inputMode: "tel",
    autoComplete: "tel",
    icon: <Phone className="size-5" aria-hidden="true" />,
  },
];

export function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      *
    </span>
  );
}

export function SchoolFormCardHeader({
  description,
}: {
  description: string;
}) {
  return (
    <div className="p-5 sm:p-6">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm">
          <Building2 className="size-7" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-foreground">Maklumat Sekolah</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SchoolFormInput({
  field,
  register,
  errors,
  disabled,
  idPrefix,
}: {
  field: SchoolFormFieldConfig;
  register: UseFormRegister<SchoolCreateValues>;
  errors: FieldErrors<SchoolCreateValues>;
  disabled: boolean;
  idPrefix: string;
}) {
  const error = errors[field.name]?.message;
  const inputId = `${idPrefix}-${field.name}`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  return (
    <div className="w-full space-y-2">
      <Label htmlFor={inputId} className="text-sm font-semibold text-foreground">
        {field.label} {field.required ? <RequiredMark /> : null}
      </Label>
      <div className="relative w-full">
        <Input
          id={inputId}
          type={field.type ?? "text"}
          inputMode={field.inputMode}
          autoComplete={field.autoComplete}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${helperId} ${errorId}` : helperId}
          className={cn(
            "h-12 w-full rounded-xl border-input bg-background/50 pr-12 text-base text-foreground placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70",
            field.uppercase && "uppercase",
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
          )}
          {...register(field.name)}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          {field.icon}
        </span>
      </div>
      {error ? (
        <p id={errorId} className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="size-4" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      <p id={helperId} className="text-sm leading-6 text-muted-foreground">
        {field.helper}
      </p>
    </div>
  );
}

function SchoolAddressField({
  register,
  errors,
  disabled,
  idPrefix,
}: {
  register: UseFormRegister<SchoolCreateValues>;
  errors: FieldErrors<SchoolCreateValues>;
  disabled: boolean;
  idPrefix: string;
}) {
  const error = errors.address?.message;
  const inputId = `${idPrefix}-address`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  return (
    <div className="w-full space-y-2">
      <Label htmlFor={inputId} className="text-sm font-semibold text-foreground">
        Alamat Sekolah <RequiredMark />
      </Label>
      <textarea
        id={inputId}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${helperId} ${errorId}` : helperId}
        className={cn(
          "min-h-[120px] w-full resize-y rounded-xl border border-input bg-background/50 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70",
          error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
        )}
        {...register("address")}
      />
      {error ? (
        <p id={errorId} className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="size-4" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      <p id={helperId} className="text-sm leading-6 text-muted-foreground">
        Masukkan alamat penuh sekolah, antara 5 hingga 500 aksara.
      </p>
    </div>
  );
}

function formatUploadSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SchoolLogoUploadField({
  previewUrl,
  hasUploadedLogo,
  previewUnavailable,
  disabled,
  uploading,
  error,
  onUpload,
  onRemove,
  onPreviewError,
  idPrefix,
}: {
  previewUrl: string;
  hasUploadedLogo: boolean;
  previewUnavailable: boolean;
  disabled: boolean;
  uploading: boolean;
  error?: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onPreviewError: () => void;
  idPrefix: string;
}) {
  const inputId = `${idPrefix}-logo`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = React.useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const openFileBrowser = () => {
    if (!disabled && !uploading) {
      inputRef.current?.click();
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled && !uploading) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);

    if (!disabled && !uploading) {
      handleFiles(event.dataTransfer.files);
    }
  };

  return (
    <div className="w-full space-y-2">
      <Label htmlFor={inputId} className="text-sm font-semibold text-foreground">
        Logo Sekolah
      </Label>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        className="sr-only"
        disabled={disabled || uploading}
        aria-describedby={error ? `${helperId} ${errorId}` : helperId}
        aria-invalid={Boolean(error)}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />

      <div
        className={cn(
          "rounded-xl border border-dashed border-input bg-background/50 p-4 transition-colors hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          dragActive && "border-primary bg-primary/5",
          error && "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
          (disabled || uploading) && "cursor-not-allowed opacity-70",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {hasUploadedLogo ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
              {previewUrl && !previewUnavailable ? (
                <img
                  src={previewUrl}
                  alt="Pratonton logo sekolah"
                  className="h-full w-full rounded-lg object-contain"
                  onError={onPreviewError}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-medium leading-5 text-muted-foreground">
                  Logo tidak dapat dipaparkan. Sila muat naik imej lain.
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold text-foreground">Logo telah dimuat naik</p>
              <p className="break-all text-sm leading-6 text-muted-foreground">
                URL logo telah disimpan dalam borang.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl px-5"
                disabled={disabled || uploading}
                onClick={openFileBrowser}
              >
                Ganti Imej
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-destructive/30 px-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={disabled || uploading}
                onClick={onRemove}
              >
                Buang
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-5 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
              {uploading ? (
                <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus className="size-6" aria-hidden="true" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {uploading ? "Memuat naik logo..." : "Seret dan lepaskan logo di sini"}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                PNG, JPG atau JPEG sahaja. Maksimum {formatUploadSize(schoolLogoMaxBytes)}.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-5"
              disabled={disabled || uploading}
              onClick={openFileBrowser}
            >
              Pilih Fail
            </Button>
          </div>
        )}
      </div>

      {error ? (
        <p id={errorId} className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="size-4" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      <p id={helperId} className="text-sm leading-6 text-muted-foreground">
        Muat naik satu imej logo sekolah. URL Cloudinary akan disimpan secara automatik.
      </p>
    </div>
  );
}

export function SchoolFormFields({
  register,
  errors,
  disabled,
  logoPreviewUrl,
  hasUploadedLogo,
  logoPreviewUnavailable,
  logoUploading,
  logoError,
  onLogoUpload,
  onLogoRemove,
  onLogoPreviewError,
  idPrefix,
}: {
  register: UseFormRegister<SchoolCreateValues>;
  errors: FieldErrors<SchoolCreateValues>;
  disabled: boolean;
  logoPreviewUrl: string;
  hasUploadedLogo: boolean;
  logoPreviewUnavailable: boolean;
  logoUploading: boolean;
  logoError?: string | null;
  onLogoUpload: (file: File) => void;
  onLogoRemove: () => void;
  onLogoPreviewError: () => void;
  idPrefix: string;
}) {
  return (
    <>
      {schoolFormFields.map((field) => (
        <SchoolFormInput
          key={field.name}
          field={field}
          register={register}
          errors={errors}
          disabled={disabled}
          idPrefix={idPrefix}
        />
      ))}
      <SchoolAddressField
        register={register}
        errors={errors}
        disabled={disabled}
        idPrefix={idPrefix}
      />
      <SchoolLogoUploadField
        previewUrl={logoPreviewUrl}
        hasUploadedLogo={hasUploadedLogo}
        previewUnavailable={logoPreviewUnavailable}
        disabled={disabled}
        uploading={logoUploading}
        error={logoError}
        onUpload={onLogoUpload}
        onRemove={onLogoRemove}
        onPreviewError={onLogoPreviewError}
        idPrefix={idPrefix}
      />
    </>
  );
}
