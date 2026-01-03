'use client'

import { useState } from 'react'
import styles from './page.module.css'
import ConfirmModal from './components/ConfirmModal'

interface UnderItem {
    id: number
    amount: string
}

export default function Home() {
    const [underItems, setUnderItems] = useState<UnderItem[]>([{ id: 1, amount: '' }])
    const [itemIdCounter, setItemIdCounter] = useState(2)
    const [receiptCount, setReceiptCount] = useState('')
    const [previousBalance, setPreviousBalance] = useState('')
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean
        message: string
        onConfirm: () => void
    }>({
        isOpen: false,
        message: '',
        onConfirm: () => { }
    })

    const addUnderItem = () => {
        setUnderItems([...underItems, { id: itemIdCounter, amount: '' }])
        setItemIdCounter(itemIdCounter + 1)
    }

    const removeUnderItem = (id: number) => {
        if (underItems.length > 1) {
            setUnderItems(underItems.filter(item => item.id !== id))
        } else {
            setUnderItems(underItems.map(item =>
                item.id === id ? { ...item, amount: '' } : item
            ))
        }
    }

    const updateUnderItem = (id: number, value: string) => {
        setUnderItems(underItems.map(item =>
            item.id === id ? { ...item, amount: value } : item
        ))
    }

    const calculateUnder6000 = () => {
        return underItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
    }

    const calculateOver6000 = () => {
        const count = parseInt(receiptCount) || 0
        return count * 6000
    }

    const getPreviousBalance = () => {
        return parseFloat(previousBalance) || 0
    }

    const getTotalAmount = () => {
        return calculateUnder6000() + calculateOver6000() + getPreviousBalance()
    }

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('ko-KR') + '원'
    }

    const resetSection1 = () => {
        setModalConfig({
            isOpen: true,
            message: '6000원 미만 결제금액 정산을 초기화하시겠습니까?',
            onConfirm: () => {
                setUnderItems([{ id: 1, amount: '' }])
                setItemIdCounter(2)
            }
        })
    }

    const resetAll = () => {
        setModalConfig({
            isOpen: true,
            message: '모든 입력 내용을 초기화하시겠습니까?',
            onConfirm: () => {
                setUnderItems([{ id: 1, amount: '' }])
                setItemIdCounter(2)
                setReceiptCount('')
                setPreviousBalance('')
            }
        })
    }

    const closeModal = () => {
        setModalConfig({ ...modalConfig, isOpen: false })
    }

    const confirmModal = () => {
        modalConfig.onConfirm()
        closeModal()
    }

    const clearReceiptCount = () => {
        setReceiptCount('')
    }

    const clearPreviousBalance = () => {
        setPreviousBalance('')
    }

    return (
        <div className={styles.container}>
            {/* 헤더 */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.headerTitle}>야식 구매비 정산</h1>
                    <p className={styles.headerSubtitle}>병원 직원 복지 정산 시스템</p>
                </div>
            </header>

            {/* 메인 컨텐츠 */}
            <main className={styles.mainContent}>
                {/* 1. 6000원 미만 결제금액 정산 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <span className={styles.sectionNumber}>1</span>
                        6000원 미만 결제금액 정산
                    </h2>
                    <div className={styles.sectionContent}>
                        <div className={styles.itemsContainer}>
                            {underItems.map((item, index) => (
                                <div key={item.id} className={styles.itemRow}>
                                    <label className={styles.itemLabel}>항목 {index + 1}</label>
                                    <input
                                        type="number"
                                        className={styles.inputField}
                                        placeholder="금액 입력"
                                        min="0"
                                        value={item.amount}
                                        onChange={(e) => updateUnderItem(item.id, e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className={styles.btnDelete}
                                        onClick={() => removeUnderItem(item.id)}
                                        title={underItems.length === 1 ? '내용 초기화' : '항목 삭제'}
                                    >
                                        <svg className={styles.deleteIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M18 6L6 18M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className={styles.buttonGroup}>
                            <button type="button" className={styles.btnAdd} onClick={addUnderItem}>
                                <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                항목 추가
                            </button>
                            <button type="button" className={styles.btnSectionReset} onClick={resetSection1}>
                                <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M3 16v5h5" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                초기화
                            </button>
                        </div>
                        <div className={styles.subtotal}>
                            <span className={styles.subtotalLabel}>6000원 미만 합계:</span>
                            <span className={styles.subtotalValue}>{formatCurrency(calculateUnder6000())}</span>
                        </div>
                    </div>
                </section>

                {/* 2. 6000원 이상 결제금액 정산 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <span className={styles.sectionNumber}>2</span>
                        6000원 이상 결제금액 정산
                    </h2>
                    <div className={styles.sectionContent}>
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>영수증 갯수</label>
                            <div className={styles.inputWrapper}>
                                <input
                                    type="number"
                                    className={`${styles.inputField} ${receiptCount ? styles.inputWithClear : ''}`}
                                    placeholder="갯수 입력"
                                    min="0"
                                    value={receiptCount}
                                    onChange={(e) => setReceiptCount(e.target.value)}
                                />
                                {receiptCount && (
                                    <button
                                        type="button"
                                        className={styles.btnInputClear}
                                        onClick={clearReceiptCount}
                                        title="입력 내용 지우기"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                                            <path d="M18 6L6 18M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className={styles.calculationInfo}>
                            <span>{(parseInt(receiptCount) || 0).toLocaleString()}개 × 6,000원 = {formatCurrency(calculateOver6000())}</span>
                        </div>
                        <div className={styles.subtotal}>
                            <span className={styles.subtotalLabel}>6000원 이상 합계:</span>
                            <span className={styles.subtotalValue}>{formatCurrency(calculateOver6000())}</span>
                        </div>
                    </div>
                </section>

                {/* 3. 이전 총 정산영수증 과부족금 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <span className={styles.sectionNumber}>3</span>
                        이전 총 정산영수증 과부족금
                    </h2>
                    <div className={styles.sectionContent}>
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>과부족금</label>
                            <div className={styles.inputWrapper}>
                                <input
                                    type="number"
                                    className={`${styles.inputField} ${previousBalance ? styles.inputWithClear : ''}`}
                                    placeholder="금액 입력 (+ 또는 -)"
                                    value={previousBalance}
                                    onChange={(e) => setPreviousBalance(e.target.value)}
                                />
                                {previousBalance && (
                                    <button
                                        type="button"
                                        className={styles.btnInputClear}
                                        onClick={clearPreviousBalance}
                                        title="입력 내용 지우기"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                                            <path d="M18 6L6 18M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className={styles.helpText}>* 플러스(+)는 그대로, 마이너스(-)는 음수로 입력</p>
                    </div>
                </section>

                {/* 4. 총 합계 */}
                <section className={styles.totalSection}>
                    <h2 className={styles.totalTitle}>
                        <span className={styles.sectionNumber}>4</span>
                        총 합계 (1+2+3)
                    </h2>
                    <div className={styles.totalBox}>
                        <div className={styles.totalAmount}>{formatCurrency(getTotalAmount())}</div>
                    </div>
                    <p className={styles.totalHelp}>* 현재 현금보유금액과 일치하는지 확인하세요</p>
                </section>

                {/* 전체 초기화 버튼 */}
                <button type="button" className={styles.btnReset} onClick={resetAll}>
                    <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" strokeWidth="2" strokeLinecap="round" />
                        <path d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" strokeWidth="2" strokeLinecap="round" />
                        <path d="M3 16v5h5" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    전체 초기화
                </button>
            </main>

            {/* 커스텀 모달 */}
            <ConfirmModal
                isOpen={modalConfig.isOpen}
                message={modalConfig.message}
                onClose={closeModal}
                onConfirm={confirmModal}
            />
        </div>
    )
}
