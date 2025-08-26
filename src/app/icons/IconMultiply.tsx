import React from "react";

const IconMultiply = (props: React.SVGProps<SVGSVGElement>) => (
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
    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
  </svg>
);

export default IconMultiply;
