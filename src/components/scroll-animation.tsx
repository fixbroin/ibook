'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

type ScrollAnimationProps = {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
};

export function ScrollAnimation({ children, delay = 0, duration = 0.5 }: ScrollAnimationProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      transition={{ duration, delay }}
    >
      {children}
    </motion.div>
  );
}
