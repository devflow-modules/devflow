"use client";

import { useEffect, useState } from "react";

export function useMediaMd(): boolean {
  const [md, setMd] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setMd(mq.matches);
    const fn = () => setMd(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return md;
}
