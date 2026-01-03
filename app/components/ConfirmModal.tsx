import styles from './ConfirmModal.module.css'

interface ConfirmModalProps {
    isOpen: boolean
    message: string
    onClose: () => void
    onConfirm: () => void
}

export default function ConfirmModal({ isOpen, message, onClose, onConfirm }: ConfirmModalProps) {
    if (!isOpen) return null

    return (
        <div className={styles.modal}>
            <div className={styles.modalContent}>
                <h3 className={styles.modalTitle}>확인</h3>
                <p className={styles.modalMessage}>{message}</p>
                <div className={styles.modalButtons}>
                    <button type="button" className={`${styles.modalBtn} ${styles.modalBtnCancel}`} onClick={onClose}>
                        취소
                    </button>
                    <button type="button" className={`${styles.modalBtn} ${styles.modalBtnConfirm}`} onClick={onConfirm}>
                        확인
                    </button>
                </div>
            </div>
        </div>
    )
}
