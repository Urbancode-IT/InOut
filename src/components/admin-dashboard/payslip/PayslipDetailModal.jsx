import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiDownload } from 'react-icons/fi';
import PayslipTemplate from './PayslipTemplate';
import { buildPayslipViewModel } from '../../../utils/payslipViewModel';

const toPlain = (value) => {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  if (typeof value === 'object') return { ...value };
  return {};
};

const PayslipDetailModal = ({
  payslip,
  mode = 'view', // 'view' | 'edit'
  onClose,
  onSave,
  onDownload,
  saving = false,
}) => {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!payslip) {
      setDraft(null);
      return;
    }
    setDraft({
      month: payslip.month || '',
      year: payslip.year || '',
      employeeId: payslip.employeeId || '',
      employeeDetails: { ...(payslip.employeeDetails || {}) },
      incomes: toPlain(payslip.incomes),
      deductions: toPlain(payslip.deductions),
      totalIncome: payslip.totalIncome ?? 0,
      totalDeductions: payslip.totalDeductions ?? 0,
      netPay: payslip.netPay ?? 0,
    });
  }, [payslip]);

  const viewModel = useMemo(() => {
    if (!draft) return null;
    return buildPayslipViewModel(
      {
        ...draft.employeeDetails,
        employeeId: draft.employeeId,
        month: draft.month,
      },
      draft.incomes,
      draft.deductions,
      draft.totalIncome,
      draft.totalDeductions,
      draft.netPay
    );
  }, [draft]);

  if (!payslip || !draft) return null;

  const incomeKeys = Object.keys(draft.incomes || {});
  const deductionKeys = Object.keys(draft.deductions || {});

  const recalc = (incomes, deductions) => {
    const totalIncome = Object.values(incomes).reduce((a, b) => a + (Number(b) || 0), 0);
    const totalDeductions = Object.values(deductions).reduce(
      (a, b) => a + (Number(b) || 0),
      0
    );
    return {
      totalIncome,
      totalDeductions,
      netPay: totalIncome - totalDeductions,
    };
  };

  const setIncome = (key, value) => {
    setDraft((prev) => {
      const incomes = { ...prev.incomes, [key]: Number(value) || 0 };
      return { ...prev, incomes, ...recalc(incomes, prev.deductions) };
    });
  };

  const setDeduction = (key, value) => {
    setDraft((prev) => {
      const deductions = { ...prev.deductions, [key]: Number(value) || 0 };
      return { ...prev, deductions, ...recalc(prev.incomes, deductions) };
    });
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.55)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'edit' ? 'Edit payslip' : 'View payslip'}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {mode === 'edit' ? 'Edit Payslip' : 'View Payslip'}
            </h2>
            <p className="text-sm text-gray-500">
              {draft.employeeDetails?.name || 'Employee'} · {draft.month || '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {mode === 'edit' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-lg p-3 bg-gray-50">
              <label className="text-sm text-gray-600">
                Month label
                <input
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={draft.month}
                  onChange={(e) => setDraft((p) => ({ ...p, month: e.target.value }))}
                />
              </label>
              <label className="text-sm text-gray-600">
                Year
                <input
                  type="number"
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={draft.year}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, year: Number(e.target.value) || '' }))
                  }
                />
              </label>
              <label className="text-sm text-gray-600">
                Employee name
                <input
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={draft.employeeDetails?.name || ''}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      employeeDetails: { ...p.employeeDetails, name: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="text-sm text-gray-600">
                Employee ID
                <input
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={draft.employeeId}
                  onChange={(e) => setDraft((p) => ({ ...p, employeeId: e.target.value }))}
                />
              </label>

              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-gray-700 mb-2">Incomes</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {incomeKeys.length === 0 ? (
                    <p className="text-sm text-gray-500">No income rows</p>
                  ) : (
                    incomeKeys.map((key) => (
                      <label key={key} className="text-sm text-gray-600">
                        {key}
                        <input
                          type="number"
                          className="mt-1 w-full border rounded-md px-3 py-2"
                          value={draft.incomes[key]}
                          onChange={(e) => setIncome(key, e.target.value)}
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-gray-700 mb-2">Deductions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {deductionKeys.length === 0 ? (
                    <p className="text-sm text-gray-500">No deduction rows</p>
                  ) : (
                    deductionKeys.map((key) => (
                      <label key={key} className="text-sm text-gray-600">
                        {key}
                        <input
                          type="number"
                          className="mt-1 w-full border rounded-md px-3 py-2"
                          value={draft.deductions[key]}
                          onChange={(e) => setDeduction(key, e.target.value)}
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-4 text-sm font-semibold text-gray-700">
                <span>Total Income: ₹{Number(draft.totalIncome || 0).toFixed(2)}</span>
                <span>Total Deductions: ₹{Number(draft.totalDeductions || 0).toFixed(2)}</span>
                <span>Net Pay: ₹{Number(draft.netPay || 0).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto border rounded-lg p-2 bg-white">
            {viewModel ? <PayslipTemplate data={viewModel} /> : null}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t bg-gray-50">
          {typeof onDownload === 'function' && (
            <button
              type="button"
              onClick={() => onDownload(payslip)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border text-teal-700 hover:bg-teal-50"
              title="Download"
              aria-label="Download payslip"
            >
              <FiDownload size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-white"
          >
            Close
          </button>
          {mode === 'edit' && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onSave?.(draft)}
              className="px-4 py-2 rounded-lg text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default PayslipDetailModal;
