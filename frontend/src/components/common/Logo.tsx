import logo from "@/assets/images/logo_web.svg";

type LogoProps = {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
};

export default function Logo({ showText = true, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: {
      image: "h-10 w-10",
      title: "text-base md:text-lg",
      subtitle: "text-xs",
    },

    md: {
      image: "h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20",
      title: "text-lg sm:text-xl md:text-2xl",
      subtitle: "text-xs sm:text-sm",
    },

    lg: {
      image: "h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28",
      title: "text-xl md:text-2xl",
      subtitle: "text-sm",
    },
  } as const;

  const variant = sizeClasses[size];

  return (
    <div className="flex items-center gap-1">
      <img
        src={logo}
        alt="DIGITAL MAIN-LiT logo"
        className={`${variant.image} object-contain`}
      />

      {showText && (
        <div className="leading-tight">
          <h1
            className={`${variant.title} font-bold tracking-wide text-foreground`}
          >
            DIGITAL MAIN-LiT
          </h1>
        </div>
      )}
    </div>
  );
}