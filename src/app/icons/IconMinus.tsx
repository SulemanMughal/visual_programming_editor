import React from "react";

const IconMinus = (props: React.SVGProps<SVGSVGElement>) => (
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
    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
  </svg>
);

export default IconMinus;
