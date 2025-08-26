import React from "react";

const IconNot = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width={24}
    height={24}
    {...props}
  >
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="32" fontFamily="Arial" fontWeight="bold" fill="#fff">!</text>
  </svg>
);

export default IconNot;
