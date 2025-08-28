import React from "react";

interface PillProps {
    text: string;
}

const pill = (text: PillProps['text']): React.ReactElement => (
    <span className="rounded-full border-2 border-sky-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">{text}</span>
);


export default pill;