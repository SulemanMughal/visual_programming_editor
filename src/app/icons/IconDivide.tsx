import React from "react";

const IconDivide = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    width={20}
    height={20}
    {...props}
  >
    <circle cx="12" cy="7" r="1.5" fill="currentColor" />
    <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    <circle cx="12" cy="17" r="1.5" fill="currentColor" />
  </svg>
);

export default IconDivide;
