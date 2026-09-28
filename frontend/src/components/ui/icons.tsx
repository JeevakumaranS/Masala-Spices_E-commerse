import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, strokeWidth = 1.75, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ----------------------------- Navigation ----------------------------- */
export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20.5 20.5-4-4" />
  </Base>
);

export const BagIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 2.5h12a1 1 0 0 1 1 1v1.2a4 4 0 0 1 .7 2.3l.9 8.4A4 4 0 0 1 16.6 21H7.4a4 4 0 0 1-4-5.6l.9-8.4a4 4 0 0 1 .7-2.3V3.5a1 1 0 0 1 1-1Z" />
    <path d="M8.5 7.5V6a3.5 3.5 0 0 1 7 0v1.5" />
  </Base>
);

export const MenuIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
  </Base>
);

export const HomeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3.8 10.6 12 3.6l8.2 7v8.6a1.8 1.8 0 0 1-1.8 1.8H5.6a1.8 1.8 0 0 1-1.8-1.8v-8.6Z" />
    <path d="M9.5 21v-6.2h5V21" />
  </Base>
);

export const CloseIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 8.5 7 7 7-7" />
  </Base>
);

export const ChevronUpIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 15.5 7-7 7 7" />
  </Base>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m15 5-7 7 7 7" />
  </Base>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m9 5 7 7-7 7" />
  </Base>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 12h16" />
    <path d="m13.5 5.5 6.5 6.5-6.5 6.5" />
  </Base>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 12H4" />
    <path d="M10.5 5.5 4 12l6.5 6.5" />
  </Base>
);

/* ----------------------------- Commerce ------------------------------- */
export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Base>
);

export const MinusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5.5 12h13" />
  </Base>
);

export const TrashIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6.5h16" />
    <path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5" />
    <path d="M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5" />
    <path d="M10.5 10v6.5M13.5 10v6.5" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Base>
);

export const CheckCircleIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </Base>
);

export const HeartIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.2 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />
  </Base>
);

export const StarIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 17l-5.3 2.7 1.1-5.9L3.5 9.7l5.9-.8L12 3.5Z" />
  </Base>
);

export const TagIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3.5 11.2V4.5a1 1 0 0 1 1-1h6.7a1 1 0 0 1 .7.3l8 8a1 1 0 0 1 0 1.4l-6.7 6.7a1 1 0 0 1-1.4 0l-8-8a1 1 0 0 1-.3-.7Z" />
    <circle cx="7.75" cy="7.75" r="1.25" />
  </Base>
);

export const PackageIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20.5 7.8 12 3 3.5 7.8v8.4L12 21l8.5-4.8V7.8Z" />
    <path d="m3.8 7.9 8.2 4.6 8.2-4.6" />
    <path d="M12 12.5V21" />
    <path d="m7.75 5.4 8.5 4.8" />
  </Base>
);

export const TruckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M2.5 6.5h10.5v9H2.5z" />
    <path d="M13 9.5h3.6a2 2 0 0 1 1.6.8l1.9 2.5a2 2 0 0 1 .4 1.2v1.5H13z" />
    <circle cx="7" cy="17.5" r="2" />
    <circle cx="17" cy="17.5" r="2" />
  </Base>
);

export const ShieldIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 2.8 4.5 6v5.6c0 4.4 3 8.1 7.5 9.6 4.5-1.5 7.5-5.2 7.5-9.6V6L12 2.8Z" />
    <path d="m9 12 2.2 2.2L15.2 10" />
  </Base>
);

export const EyeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" />
    <circle cx="12" cy="12" r="2.5" />
  </Base>
);

export const EyeOffIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m3 3 18 18" />
    <path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6.2 0 9.5 6 9.5 6a15.7 15.7 0 0 1-3.1 3.7M6.2 6.7C3.8 8.2 2.5 12 2.5 12s3.3 6 9.5 6c1 0 2-.2 2.8-.5" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Base>
);

export const RefreshIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 11.5A8 8 0 0 0 6.3 6.3L3.5 9" />
    <path d="M4 12.5A8 8 0 0 0 17.7 17.7l2.8-2.7" />
    <path d="M3.5 4v5h5M20.5 20v-5h-5" />
  </Base>
);

export const SparkleIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.2 13.7 9l5.8 1.7-5.8 1.7L12 18.2 10.3 12.4 4.5 10.7 10.3 9 12 3.2Z" />
    <path d="M18.5 3v3M20 4.5h-3" />
  </Base>
);

/* ------------------------------- Spice -------------------------------- */
export const FlameIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21c3.6 0 6-2.4 6-5.7 0-4.3-4.4-6.3-4.1-11.3-2.5 1.4-4 4-4 6 0 1-.5 1.7-1.2 1.7-.8 0-1.3-.8-1.3-2-1.3 1.4-1.4 3.3-1.4 5.6C6 18.6 8.4 21 12 21Z" />
  </Base>
);

export const LeafIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 4c0 9-5.2 13.5-11 13.5A5.5 5.5 0 0 1 3.5 12C3.5 6.2 8 4 20 4Z" />
    <path d="M4.5 20c2.5-4.5 6-7.5 11-9.5" />
  </Base>
);

/** Star anise — the brand's signature motif, as a stroked outline icon. */
export const StarAniseIcon = (p: IconProps) => (
  <Base {...p}>
    <polygon
      points="26,16 20.07,17.68 23.07,23.07 17.68,20.07 16,26 14.32,20.07 8.93,23.07 11.93,17.68 6,16 11.93,14.32 8.93,8.93 14.32,11.93 16,6 17.68,11.93 23.07,8.93 20.07,14.32"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="16" r="2.6" />
  </Base>
);

export const ClockIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.3l3.3 2" />
  </Base>
);

export const UtensilsIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 3v7.5a2.5 2.5 0 0 0 5 0V3" />
    <path d="M8.5 10.5V21" />
    <path d="M17.5 3c-1.4 1.4-2 3.3-2 5.5 0 1.7.7 2.8 2 3V21" />
  </Base>
);

/* ------------------------------ Contact ------------------------------- */
export const PhoneIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M8.4 3.5H5.9a2 2 0 0 0-2 2.2c.5 4 2 7.4 4.3 10.1a17 17 0 0 0 6.9 5.4c2 .8 4-.4 4.6-2.4l.5-1.7a2 2 0 0 0-1-2.2l-2.6-1.4a2 2 0 0 0-2.3.4l-.9 1a13.6 13.6 0 0 1-4.6-4.6l1-.9a2 2 0 0 0 .4-2.3L9.6 4.6a2 2 0 0 0-1.2-1.1Z" />
  </Base>
);

export const MailIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.8 6.5 7.1 5.1a2 2 0 0 0 2.2 0l7.1-5.1" />
  </Base>
);

export const MapPinIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21c4-4.4 6.5-7.6 6.5-11A6.5 6.5 0 0 0 5.5 10c0 3.4 2.5 6.6 6.5 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </Base>
);

export const InfoIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.8v.4" />
  </Base>
);

export const AlertIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M10.3 4.2 2.9 17.1A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.9L13.7 4.2a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5V13M12 16.4v.3" />
  </Base>
);

export const FilterIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Base>
);

export const UserIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8.2" r="3.7" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </Base>
);

/* ------------------------------ Social -------------------------------- */
export const InstagramIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
  </Base>
);

export const FacebookIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M14.5 21v-8h2.7l.5-3.2h-3.2V7.7c0-.9.3-1.6 1.7-1.6H18V3.2A22 22 0 0 0 15.5 3c-2.6 0-4.3 1.5-4.3 4.4v2.4H8.3V13h2.9v8h3.3Z" />
  </Base>
);

export const XIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 4h4.2l4 5.5L16.9 4H20l-6.3 7.7L20.4 20h-4.2l-4.3-5.9L7 20H3.8l6.6-8.1L4 4Z" />
  </Base>
);

export const YoutubeIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="2.8" y="6" width="18.4" height="12" rx="4" />
    <path d="m10.5 9.8 4.5 2.4-4.5 2.4V9.8Z" fill="currentColor" stroke="none" />
  </Base>
);

export const WhatsAppIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z" />
    <path
      d="M8.5 8.2c.3-.7.6-.7 1-.7.3 0 .6 0 .8.6l.7 1.6c.1.2 0 .5-.2.7l-.5.6c-.1.2-.1.4 0 .6.5.9 1.3 1.6 2.3 2.1.2.1.4.1.6-.1l.7-.7c.2-.2.5-.3.7-.2l1.6.8c.5.3.6.5.6.8 0 .6-.4 1.2-1 1.5-.6.3-1.3.4-2.1.2-2.5-.7-4.6-2.3-5.7-4.7-.3-.7-.3-1.4 0-2Z"
      fill="currentColor"
      stroke="none"
    />
  </Base>
);
