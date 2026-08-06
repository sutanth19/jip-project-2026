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
      image: "h-12 w-12",
      title: "text-lg sm:text-xl md:text-2xl",
      subtitle: "text-xs sm:text-sm",
    },
    lg: {
      image: "h-14 w-14",
      title: "text-xl md:text-2xl",
      subtitle: "text-sm",
    },
  } as const

  const variant = sizeClasses[size]

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <img
        src={logo}
        alt="Digital Main-LiT logo"
        className={`${variant.image} object-contain`}
      />

      {showText && (
        <div className="leading-tight">
          <h1 className={`${variant.title} font-bold tracking-wide text-foreground`}>
            Digital Main-LiT
          </h1>

          <p className={`${variant.subtitle} text-muted-foreground`}>
            
          </p>
        </div>
      )}
    </div>
  );
}
