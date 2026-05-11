import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

interface Props extends HTMLMotionProps<"div"> {
  children: ReactNode;
  hover?: boolean;
}
export function GlassCard({ children, hover = true, className = "", ...rest }: Props) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, boxShadow: "0 20px 40px rgba(26,86,196,0.3)" } : undefined}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className={`glass p-5 ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
