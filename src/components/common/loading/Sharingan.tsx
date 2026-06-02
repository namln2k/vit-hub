

import styles from './Sharingan.module.scss';

export default function Sharingan() {
  return (
    <div className={styles.sharingan}>
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
