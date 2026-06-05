import type { CSSProperties } from 'react';
import styles from './Sharingan.module.css';

interface SharinganProps {
  className?: string;
  label?: string;
  size?: number;
}

export default function Sharingan({ className, label = 'Đang tải', size }: SharinganProps) {
  const style = size
    ? ({ '--base-size': `${size}px` } as CSSProperties & Record<'--base-size', string>)
    : undefined;

  return (
    <div
      className={className ? `${styles.sharingan} ${className}` : styles.sharingan}
      role="status"
      aria-label={label}
      style={style}
    >
      <div className={styles.pupil}></div>
      <div className={styles.iris}></div>
      <div className={styles.tomoes}>
        <div className={styles['tomoe-area']}>
          <div className={styles.tomoe}></div>
        </div>
        <div className={styles['tomoe-area']}>
          <div className={styles.tomoe}></div>
        </div>
        <div className={styles['tomoe-area']}>
          <div className={styles.tomoe}></div>
        </div>
      </div>
    </div>
  );
}
