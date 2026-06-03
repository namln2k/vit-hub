import type { CSSProperties } from 'react';
import styles from './Sharingan.module.scss';

interface SharinganProps {
  size?: number;
}

export default function Sharingan({ size }: SharinganProps) {
  const style = size
    ? ({ '--base-size': `${size}px` } as CSSProperties & Record<'--base-size', string>)
    : undefined;

  return (
    <div className={styles.sharingan} style={style}>
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
