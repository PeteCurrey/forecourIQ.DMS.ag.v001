'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, Upload, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import Link from 'next/link';

interface StockFieldMapping {
  registration: string;
  make: string;
  model: string;
  variant: string;
  year: string;
  mileage: string;
  purchase_price: string;
  asking_price: string;
  status: string;
}

export default function StockImportClient() {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<StockFieldMapping>({
    registration: '',
    make: '',
    model: '',
    variant: '',
    year: '',
    mileage: '',
    purchase_price: '',
    asking_price: '',
    status: '',
  });
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState<{ total: number; imported: number; invalid: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle CSV file upload
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
        setErrorMsg('CSV file must contain a header row and at least one data row.');
        return;
      }

      // Simple CSV split helper (handles quoted values)
      const parseCSVLine = (line: string) => {
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
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

      // Auto-suggest mappings based on common column names
      const autoMap: StockFieldMapping = {
        registration: headerRow.find(h => /reg|vrm|plate|license/i.test(h)) || '',
        make: headerRow.find(h => /make|manufacturer|brand/i.test(h)) || '',
        model: headerRow.find(h => /model/i.test(h)) || '',
        variant: headerRow.find(h => /variant|derivative|trim|version/i.test(h)) || '',
        year: headerRow.find(h => /year|yr|registered/i.test(h)) || '',
        mileage: headerRow.find(h => /mile|odo/i.test(h)) || '',
        purchase_price: headerRow.find(h => /cost|bought|purchase|buy/i.test(h)) || '',
        asking_price: headerRow.find(h => /price|advertised|retail|asking/i.test(h)) || '',
        status: headerRow.find(h => /status|state/i.test(h)) || '',
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
      const res = await fetch('/api/import/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          mapping,
          rows: rawRows,
          dryRun: true,
        }),
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
      const res = await fetch('/api/import/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          mapping,
          rows: rawRows,
          dryRun: false,
        }),
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
      {/* Header */}
      <div>
        <Link href="/stock" className="text-xs text-[var(--pewter)] hover:text-[var(--cream)] flex items-center gap-1 mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Stockbook
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--cream)] tracking-tight">Import Stock (CSV)</h1>
        <p className="text-sm text-[var(--pewter)] mt-1">
          Upload and validate bulk vehicle inventory into your ForecourIQ Stockbook.
        </p>
      </div>

      {/* Step Indicator */}
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

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Upload */}
      {step === 'upload' && (
        <div className="bg-[var(--carbon)] border border-[var(--steel)] rounded-xl p-10 text-center space-y-4 reveal-2">
          <div className="w-12 h-12 rounded-full bg-[var(--asphalt)] border border-[var(--steel)] flex items-center justify-center mx-auto text-[var(--cream)]">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-base font-medium text-[var(--cream)]">Select a CSV file to import</p>
            <p className="text-xs text-[var(--pewter)] mt-1">Accepts CSV files up to 10MB (max 1,000 vehicles per batch)</p>
          </div>
          <div className="pt-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--cream)] text-[var(--void)] text-xs font-medium rounded-md cursor-pointer hover:bg-[var(--cream)]/90 transition-colors">
              <span>Choose CSV File</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: Column Mapping */}
      {step === 'mapping' && (
        <div className="bg-[var(--carbon)] border border-[var(--steel)] rounded-xl p-6 space-y-6 reveal-2">
          <div className="flex items-center justify-between border-b border-[var(--steel)] pb-4">
            <div>
              <p className="text-sm font-medium text-[var(--cream)]">Map File Columns ({fileName})</p>
              <p className="text-xs text-[var(--pewter)]">{rawRows.length} data rows detected</p>
            </div>
            <Button variant="ghost" onClick={() => setStep('upload')} className="text-xs">
              Change File
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { field: 'registration', label: 'Registration / VRM *', required: true },
              { field: 'make', label: 'Make *', required: true },
              { field: 'model', label: 'Model *', required: true },
              { field: 'variant', label: 'Variant / Derivative' },
              { field: 'year', label: 'Registration Year' },
              { field: 'mileage', label: 'Mileage' },
              { field: 'purchase_price', label: 'Purchase Cost (£)' },
              { field: 'asking_price', label: 'Asking Price (£)' },
              { field: 'status', label: 'Stock Status' },
            ].map(col => (
              <div key={col.field} className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--cream)]">
                  {col.label}
                </label>
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
              disabled={importing || !mapping.registration || !mapping.make || !mapping.model}
              className="bg-[var(--cream)] text-[var(--void)] hover:bg-[var(--cream)]/90 text-xs"
            >
              {importing ? 'Validating...' : 'Validate & Preview →'}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Preview & Validation */}
      {step === 'preview' && validationResult && (
        <div className="space-y-6 reveal-2">
          <div className="bg-[var(--carbon)] border border-[var(--steel)] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-[var(--cream)]">Validation Summary</h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-600 font-medium">{validationResult.validRows.length} Valid</span>
                {validationResult.errors.length > 0 && (
                  <span className="text-amber-600 font-medium">{validationResult.errors.length} Errors</span>
                )}
              </div>
            </div>

            {validationResult.errors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2 text-xs">
                <p className="font-semibold text-amber-800">Rows with issues will be skipped:</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {validationResult.errors.map((err: any, i: number) => (
                    <p key={i} className="text-amber-700 font-mono">
                      Row {err.row}: [{err.field}] {err.message}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Preview table */}
            <div className="overflow-x-auto border border-[var(--steel)] rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--asphalt)] text-[var(--pewter)] border-b border-[var(--steel)]">
                  <tr>
                    <th className="px-3 py-2">VRM</th>
                    <th className="px-3 py-2">Make</th>
                    <th className="px-3 py-2">Model</th>
                    <th className="px-3 py-2">Year</th>
                    <th className="px-3 py-2">Mileage</th>
                    <th className="px-3 py-2">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--steel)] text-[var(--cream)]">
                  {validationResult.preview.map((row: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-mono font-medium">{row.registration}</td>
                      <td className="px-3 py-2">{row.make}</td>
                      <td className="px-3 py-2">{row.model}</td>
                      <td className="px-3 py-2">{row.year || '—'}</td>
                      <td className="px-3 py-2">{row.mileage ? row.mileage.toLocaleString() : '—'}</td>
                      <td className="px-3 py-2">{row.asking_price ? `£${Number(row.asking_price).toLocaleString()}` : '—'}</td>
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
                {importing ? 'Importing...' : `Import ${validationResult.validRows.length} Vehicles`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Complete */}
      {step === 'complete' && importStats && (
        <div className="bg-[var(--carbon)] border border-[var(--steel)] rounded-xl p-8 text-center space-y-4 reveal-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--cream)]">Stock Import Complete</h2>
            <p className="text-xs text-[var(--pewter)] mt-1">
              Successfully imported {importStats.imported} vehicles to your stockbook.
              {importStats.invalid > 0 && ` (${importStats.invalid} rows skipped due to errors)`}
            </p>
          </div>
          <div className="pt-4 flex justify-center gap-3">
            <Button variant="outline" onClick={() => { setStep('upload'); setFileName(''); setRawRows([]); }} className="text-xs">
              Import Another File
            </Button>
            <Link href="/stock">
              <Button className="bg-[var(--cream)] text-[var(--void)] hover:bg-[var(--cream)]/90 text-xs">
                View Stockbook →
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
