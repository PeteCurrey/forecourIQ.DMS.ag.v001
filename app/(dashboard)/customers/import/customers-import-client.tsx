'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, Upload, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface CustomerFieldMapping {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  marketing_consent: string;
  consent_date: string;
}

export default function CustomersImportClient() {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<CustomerFieldMapping>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    postcode: '',
    marketing_consent: '',
    consent_date: '',
  });
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState<{ total: number; imported: number; invalid: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        setErrorMsg('CSV file must contain a header row and at least one customer record.');
        return;
      }

      const parseCSVLine = (line: string) => {
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else cur += char;
        }
        result.push(cur.trim());
        return result;
      };

      const headerRow = parseCSVLine(lines[0]);
      setHeaders(headerRow);

      const rows: Record<string, any>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const rowObj: Record<string, any> = {};
        headerRow.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });
        rows.push(rowObj);
      }
      setRawRows(rows);

      const autoMap: CustomerFieldMapping = {
        first_name: headerRow.find(h => /first|forename|given/i.test(h)) || '',
        last_name: headerRow.find(h => /last|surname|family/i.test(h)) || '',
        email: headerRow.find(h => /email|mail/i.test(h)) || '',
        phone: headerRow.find(h => /phone|mobile|tel/i.test(h)) || '',
        address: headerRow.find(h => /address|street/i.test(h)) || '',
        postcode: headerRow.find(h => /postcode|zip/i.test(h)) || '',
        marketing_consent: headerRow.find(h => /consent|optin|marketing/i.test(h)) || '',
        consent_date: headerRow.find(h => /consent_date|optin_date/i.test(h)) || '',
      };
      setMapping(autoMap);
      setStep('mapping');
    };
    reader.readAsText(file);
  }

  async function handleValidate() {
    setImporting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/import/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, mapping, rows: rawRows, dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Validation failed');
      setValidationResult(data.validation);
      setStep('preview');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setImporting(false);
    }
  }

  async function handleExecuteImport() {
    setImporting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/import/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, mapping, rows: rawRows, dryRun: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setImportStats({
        total: data.job.rows_total,
        imported: data.job.rows_imported,
        invalid: data.job.rows_invalid,
      });
      setStep('complete');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 reveal-1">
      <div>
        <Link href="/customers" className="text-xs text-[var(--pewter)] hover:text-[var(--cream)] flex items-center gap-1 mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--cream)] tracking-tight">Import Customers (CSV)</h1>
        <p className="text-sm text-[var(--pewter)] mt-1">
          Safely import buyer records with deterministic GDPR consent verification.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-[var(--steel)] pb-4 text-xs">
        {[
          { id: 'upload', label: '1. Upload File' },
          { id: 'mapping', label: '2. Map Columns' },
          { id: 'preview', label: '3. Validate & Preview' },
          { id: 'complete', label: '4. Summary' },
        ].map(s => (
          <span
            key={s.id}
            className={cn(
              'px-3 py-1 rounded-md font-medium',
              step === s.id
                ? 'bg-[var(--cream)] text-[var(--void)]'
                : 'text-[var(--pewter)]'
            )}
          >
            {s.label}
          </span>
        ))}
      </div>

      {/* GDPR Consent Banner */}
      <div className="bg-[var(--asphalt)] border border-[var(--steel)] rounded-lg p-4 flex items-start gap-3 text-xs text-[var(--pewter)]">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[var(--cream)]">GDPR Consent Safety Rule:</span> Marketing opt-in will only be recorded if your CSV explicitly includes both affirmative consent AND a valid consent timestamp. All other records will be marked as non-consented.
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {step === 'upload' && (
        <div className="bg-[var(--carbon)] border border-[var(--steel)] rounded-xl p-10 text-center space-y-4 reveal-2">
          <div className="w-12 h-12 rounded-full bg-[var(--asphalt)] border border-[var(--steel)] flex items-center justify-center mx-auto text-[var(--cream)]">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-base font-medium text-[var(--cream)]">Select Customer CSV</p>
            <p className="text-xs text-[var(--pewter)] mt-1">Accepts CSV files with customer names, emails, and phone numbers</p>
          </div>
          <div className="pt-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--cream)] text-[var(--void)] text-xs font-medium rounded-md cursor-pointer hover:bg-[var(--cream)]/90 transition-colors">
              <span>Choose CSV File</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {step === 'mapping' && (
        <div className="bg-[var(--carbon)] border border-[var(--steel)] rounded-xl p-6 space-y-6 reveal-2">
          <div className="flex items-center justify-between border-b border-[var(--steel)] pb-4">
            <div>
              <p className="text-sm font-medium text-[var(--cream)]">Map File Columns ({fileName})</p>
              <p className="text-xs text-[var(--pewter)]">{rawRows.length} customer records detected</p>
            </div>
            <Button variant="ghost" onClick={() => setStep('upload')} className="text-xs">
              Change File
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { field: 'first_name', label: 'First Name *' },
              { field: 'last_name', label: 'Last Name *' },
              { field: 'email', label: 'Email Address' },
              { field: 'phone', label: 'Telephone Number' },
              { field: 'address', label: 'Street Address' },
              { field: 'postcode', label: 'Postcode' },
              { field: 'marketing_consent', label: 'Marketing Consent (True/Yes)' },
              { field: 'consent_date', label: 'Consent Timestamp / Date' },
            ].map(col => (
              <div key={col.field} className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--cream)]">{col.label}</label>
                <select
                  value={(mapping as any)[col.field] || ''}
                  onChange={e => setMapping({ ...mapping, [col.field]: e.target.value })}
                  className="w-full bg-[var(--void)] border border-[var(--steel)] rounded-md px-3 py-2 text-xs text-[var(--cream)] focus:outline-none"
                >
                  <option value="">-- Do not import --</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--steel)] pt-4">
            <Button variant="ghost" onClick={() => setStep('upload')} className="text-xs">Cancel</Button>
            <Button
              onClick={handleValidate}
              disabled={importing || (!mapping.first_name && !mapping.last_name)}
              className="bg-[var(--cream)] text-[var(--void)] hover:bg-[var(--cream)]/90 text-xs"
            >
              {importing ? 'Validating...' : 'Validate & Preview →'}
            </Button>
          </div>
        </div>
      )}

      {step === 'preview' && validationResult && (
        <div className="space-y-6 reveal-2">
          <div className="bg-[var(--carbon)] border border-[var(--steel)] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-[var(--cream)]">Validation Summary</h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-600 font-medium">{validationResult.validRows.length} Valid</span>
                {validationResult.errors.length > 0 && (
                  <span className="text-amber-600 font-medium">{validationResult.errors.length} Skipped</span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-[var(--steel)] rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--asphalt)] text-[var(--pewter)] border-b border-[var(--steel)]">
                  <tr>
                    <th className="px-3 py-2">Customer Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Postcode</th>
                    <th className="px-3 py-2">Marketing Consent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--steel)] text-[var(--cream)]">
                  {validationResult.preview.map((row: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-medium">{row.first_name} {row.last_name}</td>
                      <td className="px-3 py-2">{row.email || '—'}</td>
                      <td className="px-3 py-2">{row.phone || '—'}</td>
                      <td className="px-3 py-2">{row.postcode || '—'}</td>
                      <td className="px-3 py-2">
                        {row.marketing_consent ? (
                          <span className="text-emerald-600 font-medium">✓ Opted In</span>
                        ) : (
                          <span className="text-[var(--pewter)]">Not Opted In</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep('mapping')} className="text-xs">← Adjust Mapping</Button>
              <Button
                onClick={handleExecuteImport}
                disabled={importing || validationResult.validRows.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                {importing ? 'Importing...' : `Import ${validationResult.validRows.length} Customers`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'complete' && importStats && (
        <div className="bg-[var(--carbon)] border border-[var(--steel)] rounded-xl p-8 text-center space-y-4 reveal-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--cream)]">Customer Import Complete</h2>
            <p className="text-xs text-[var(--pewter)] mt-1">
              Successfully imported {importStats.imported} customer records into your CRM.
            </p>
          </div>
          <div className="pt-4 flex justify-center gap-3">
            <Button variant="outline" onClick={() => { setStep('upload'); setFileName(''); setRawRows([]); }} className="text-xs">
              Import Another File
            </Button>
            <Link href="/customers">
              <Button className="bg-[var(--cream)] text-[var(--void)] hover:bg-[var(--cream)]/90 text-xs">
                View Customers →
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
