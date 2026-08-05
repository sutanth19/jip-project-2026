import { useEffect, useId, useState } from "react";

import {
  ArrowLeft,
  AtSign,
  Building2,
  Eye,
  EyeOff,
  Hash,
  School,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { z } from "zod";

import PasswordInput from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const userTypes = ["admin", "teacher", "student", "parent"] as const;

export type UserType = (typeof userTypes)[number];

const loginSchema = z
  .object({
    userType: z.enum(userTypes),
    email: z.string().trim(),
    loginId: z.string().trim(),
    password: z.string(),
    rememberMe: z.boolean().default(false),
    schoolId: z.string(),
    classId: z.string(),
    studentId: z.string().trim(),
    pin: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.userType === "admin") {
      if (!values.email) {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: "Sila masukkan e-mel.",
        });
      } else if (!z.email().safeParse(values.email).success) {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: "E-mel tidak sah.",
        });
      }

      if (!values.password) {
        ctx.addIssue({
          code: "custom",
          path: ["password"],
          message: "Sila masukkan kata laluan.",
        });
      }
    }

    if (
      values.userType === "teacher" ||
      values.userType === "parent"
    ) {
      if (!values.loginId) {
        ctx.addIssue({
          code: "custom",
          path: ["loginId"],
          message: "Sila masukkan Login ID.",
        });
      }

      if (!values.password) {
        ctx.addIssue({
          code: "custom",
          path: ["password"],
          message: "Sila masukkan kata laluan.",
        });
      }
    }

    if (values.userType === "student") {
      if (!values.schoolId) {
        ctx.addIssue({
          code: "custom",
          path: ["schoolId"],
          message: "Sila pilih sekolah.",
        });
      }

      if (!values.classId) {
        ctx.addIssue({
          code: "custom",
          path: ["classId"],
          message: "Sila pilih kelas.",
        });
      }

      if (!values.studentId) {
        ctx.addIssue({
          code: "custom",
          path: ["studentId"],
          message: "Sila masukkan ID Murid.",
        });
      }

      if (!values.pin) {
        ctx.addIssue({
          code: "custom",
          path: ["pin"],
          message: "Sila masukkan PIN.",
        });
      } else if (!/^\d{4}$/.test(values.pin)) {
        ctx.addIssue({
          code: "custom",
          path: ["pin"],
          message: "PIN mesti mengandungi 4 digit.",
        });
      }
    }
  });

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginFormProps = {
  className?: string;
  userType: UserType;
  onUserTypeChange?: (userType: UserType) => void;
};

const loginDefaults: LoginFormValues = {
  userType: "admin",
  email: "",
  loginId: "",
  password: "",
  rememberMe: false,
  schoolId: "",
  classId: "",
  studentId: "",
  pin: "",
};

const schoolOptions = [
  {
    value: "school-darul-aman",
    label: "SK Kampus Darul Aman",
  },
  {
    value: "school-literasi",
    label: "SK Literasi Bestari",
  },
];

const classOptions = [
  {
    value: "1-amanah",
    label: "Tahun 1 Amanah",
  },
  {
    value: "2-bestari",
    label: "Tahun 2 Bestari",
  },
  {
    value: "3-cerdas",
    label: "Tahun 3 Cerdas",
  },
];

export default function LoginForm({
  className,
  userType,
  onUserTypeChange,
}: LoginFormProps) {
  const [placeholderMessage, setPlaceholderMessage] =
    useState("");
  const [isPinVisible, setIsPinVisible] = useState(false);

  const emailInputId = useId();
  const emailErrorId = useId();
  const loginIdInputId = useId();
  const loginIdErrorId = useId();
  const schoolId = useId();
  const schoolErrorId = useId();
  const classId = useId();
  const classErrorId = useId();
  const studentId = useId();
  const studentErrorId = useId();
  const pinId = useId();
  const pinErrorId = useId();
  const rememberMeId = useId();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      ...loginDefaults,
      userType,
    },
    mode: "onSubmit",
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  /*
   * Keep React Hook Form synchronized with the user type
   * controlled by LoginPage.tsx.
   */
  useEffect(() => {
    setValue("userType", userType, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [setValue, userType]);

  const pinRegistration = register("pin", {
    setValueAs: (value) =>
      String(value ?? "")
        .replace(/\D/g, "")
        .slice(0, 4),
  });

  const onSubmit = handleSubmit(async (values) => {
    setPlaceholderMessage("");

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 900);
    });

    console.log("Login form values:", values);

    setPlaceholderMessage(
      "Log masuk akan disambungkan kepada API pengesahan dalam langkah seterusnya.",
    );
  });

  const handleTabChange = (value: string) => {
    const nextUserType = value as UserType;

    /*
     * Update LoginPage.tsx.
     * AuthBrandPanel receives the same value and changes the image.
     */
    onUserTypeChange?.(nextUserType);

    setPlaceholderMessage("");
    setIsPinVisible(false);

    reset({
      ...loginDefaults,
      userType: nextUserType,
    });
  };

  const emailError = errors.email?.message;
  const loginIdError = errors.loginId?.message;
  const passwordError = errors.password?.message;
  const schoolError = errors.schoolId?.message;
  const classError = errors.classId?.message;
  const studentIdError = errors.studentId?.message;
  const pinError = errors.pin?.message;

  return (
    <Card
      className={cn(
        "w-full max-w-[500px] rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <CardHeader className="space-y-2 pb-0 text-center">
        <p className="text-sm font-semibold text-primary">
          Portal Pengguna
        </p>

        <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Selamat Datang
        </CardTitle>

        <CardDescription className="text-sm leading-6 text-muted-foreground sm:text-base">
          Log masuk untuk mengakses LITERASI DIGITAL.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 sm:pt-8">
        <form className="space-y-5" onSubmit={onSubmit}>
          <input type="hidden" {...register("userType")} />

          <Tabs
            value={userType}
            onValueChange={handleTabChange}
            className="gap-5"
          >
            <div className="space-y-3">
              <p className="text-center text-base font-semibold text-foreground">
                Pilih Jenis Pengguna
              </p>

              <TabsList aria-label="Pilih jenis pengguna">
                <TabsTrigger value="admin">
                  Admin
                </TabsTrigger>

                <TabsTrigger value="teacher">
                  Guru
                </TabsTrigger>

                <TabsTrigger value="student">
                  Murid
                </TabsTrigger>

                <TabsTrigger value="parent">
                  Ibu Bapa
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="admin"
              forceMount={false}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label
                  htmlFor={emailInputId}
                  className="text-sm font-medium text-foreground"
                >
                  Email
                </Label>

                <div className="relative">
                  <AtSign
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <Input
                    id={emailInputId}
                    type="email"
                    autoComplete="username"
                    spellCheck={false}
                    placeholder="Masukkan e-mel"
                    aria-invalid={
                      emailError ? true : undefined
                    }
                    aria-describedby={
                      emailError
                        ? emailErrorId
                        : undefined
                    }
                    className="h-11 rounded-xl pr-4 pl-10 sm:h-12"
                    {...register("email")}
                  />
                </div>

                {emailError ? (
                  <p
                    id={emailErrorId}
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {emailError}
                  </p>
                ) : null}
              </div>

              <PasswordInput
                id={`${emailInputId}-password`}
                placeholder="Masukkan kata laluan"
                errorMessage={passwordError}
                {...register("password")}
              />
            </TabsContent>

            <TabsContent
              value="teacher"
              forceMount={false}
              className="space-y-5"
            >
              <LoginIdField
                id={loginIdInputId}
                label="Login ID"
                placeholder="Masukkan e-mel atau ID Guru"
                errorId={loginIdErrorId}
                errorMessage={loginIdError}
                icon="user"
                registration={register("loginId")}
              />

              <PasswordInput
                id={`${loginIdInputId}-teacher-password`}
                placeholder="Masukkan kata laluan"
                errorMessage={passwordError}
                {...register("password")}
              />
            </TabsContent>

            <TabsContent
              value="student"
              forceMount={false}
              className="space-y-5"
            >
              <SelectField
                id={schoolId}
                label="Sekolah"
                errorId={schoolErrorId}
                errorMessage={schoolError}
                icon={
                  <School
                    className="size-4"
                    aria-hidden="true"
                  />
                }
                registration={register("schoolId")}
              >
                <option value="">
                  Pilih sekolah
                </option>

                {schoolOptions.map((school) => (
                  <option
                    key={school.value}
                    value={school.value}
                  >
                    {school.label}
                  </option>
                ))}
              </SelectField>

              <SelectField
                id={classId}
                label="Kelas"
                errorId={classErrorId}
                errorMessage={classError}
                icon={
                  <Building2
                    className="size-4"
                    aria-hidden="true"
                  />
                }
                registration={register("classId")}
              >
                <option value="">
                  Pilih kelas
                </option>

                {classOptions.map((schoolClass) => (
                  <option
                    key={schoolClass.value}
                    value={schoolClass.value}
                  >
                    {schoolClass.label}
                  </option>
                ))}
              </SelectField>

              <LoginIdField
                id={studentId}
                label="ID Murid"
                placeholder="Masukkan ID Murid"
                errorId={studentErrorId}
                errorMessage={studentIdError}
                icon="hash"
                registration={register("studentId")}
              />

              <div className="space-y-2">
                <Label
                  htmlFor={pinId}
                  className="text-sm font-medium text-foreground"
                >
                  PIN
                </Label>

                <div className="relative">
                  <Hash
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <Input
                    id={pinId}
                    type={
                      isPinVisible
                        ? "text"
                        : "password"
                    }
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    pattern="[0-9]*"
                    placeholder="••••"
                    spellCheck={false}
                    aria-invalid={
                      pinError ? true : undefined
                    }
                    aria-describedby={
                      pinError
                        ? pinErrorId
                        : undefined
                    }
                    className="h-11 rounded-xl pr-11 pl-10 tracking-[0.4em] sm:h-12"
                    {...pinRegistration}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      isPinVisible
                        ? "Sembunyikan PIN"
                        : "Tunjukkan PIN"
                    }
                    aria-pressed={isPinVisible}
                    onClick={() =>
                      setIsPinVisible(
                        (current) => !current,
                      )
                    }
                    onMouseDown={(event) =>
                      event.preventDefault()
                    }
                    className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 rounded-lg border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {isPinVisible ? (
                      <EyeOff
                        className="size-4"
                        aria-hidden="true"
                      />
                    ) : (
                      <Eye
                        className="size-4"
                        aria-hidden="true"
                      />
                    )}
                  </Button>
                </div>

                {pinError ? (
                  <p
                    id={pinErrorId}
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {pinError}
                  </p>
                ) : null}
              </div>
            </TabsContent>

           <TabsContent
  value="parent"
  forceMount={false}
  className="space-y-5"
>
  <LoginIdField
    id={`${loginIdInputId}-parent`}
    label="Login ID"
    placeholder="Masukkan e-mel atau nombor telefon"
    errorId={loginIdErrorId}
    errorMessage={loginIdError}
    icon="user"
    registration={register("loginId")}
  />

  <PasswordInput
    id={`${loginIdInputId}-parent-password`}
    placeholder="Masukkan kata laluan"
    errorMessage={passwordError}
    {...register("password")}
  />
</TabsContent>
          </Tabs>

          {userType !== "student" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label
                htmlFor={rememberMeId}
                className="inline-flex items-center gap-3 text-sm text-foreground"
              >
                <input
                  id={rememberMeId}
                  type="checkbox"
                  className="size-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  {...register("rememberMe")}
                />

                Ingat Saya
              </label>

              <Link
                to="/forgot-password"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                Lupa Kata Laluan?
              </Link>
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:h-12 sm:text-base"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Sedang log masuk..."
              : "Log Masuk"}
          </Button>

          {placeholderMessage ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-border bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground"
            >
              {placeholderMessage}
            </div>
          ) : null}

          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <ArrowLeft
              className="size-4"
              aria-hidden="true"
            />

            Kembali ke halaman utama
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}

type FieldRegistration = UseFormRegisterReturn;

type LoginIdFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  errorId: string;
  errorMessage?: string;
  icon: "hash" | "user";
  registration: FieldRegistration;
};

function LoginIdField({
  id,
  label,
  placeholder,
  errorId,
  errorMessage,
  icon,
  registration,
}: LoginIdFieldProps) {
  const Icon =
    icon === "hash" ? Hash : UserRound;

  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-sm font-medium text-foreground"
      >
        {label}
      </Label>

      <div className="relative">
        <Icon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />

        <Input
          id={id}
          type="text"
          autoComplete="username"
          spellCheck={false}
          placeholder={placeholder}
          aria-invalid={
            errorMessage ? true : undefined
          }
          aria-describedby={
            errorMessage ? errorId : undefined
          }
          className="h-11 rounded-xl pr-4 pl-10 sm:h-12"
          {...registration}
        />
      </div>

      {errorMessage ? (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

type SelectFieldProps = {
  id: string;
  label: string;
  errorId: string;
  errorMessage?: string;
  icon: React.ReactNode;
  registration: FieldRegistration;
  children: React.ReactNode;
};

function SelectField({
  id,
  label,
  errorId,
  errorMessage,
  icon,
  registration,
  children,
}: SelectFieldProps) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-sm font-medium text-foreground"
      >
        {label}
      </Label>

      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>

        <select
          id={id}
          aria-invalid={
            errorMessage ? true : undefined
          }
          aria-describedby={
            errorMessage ? errorId : undefined
          }
          className="h-11 w-full rounded-xl border border-input bg-background py-2 pr-4 pl-10 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 sm:h-12"
          {...registration}
        >
          {children}
        </select>
      </div>

      {errorMessage ? (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}