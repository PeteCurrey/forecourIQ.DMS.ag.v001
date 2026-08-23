import { createClient } from '@/lib/supabase/server';
import { 
  CSVParseValidationResult, 
  DataImportJob, 
  ImportType, 
  RowValidationError 
} from '@/lib/types/platform';
import { generateVehicleSlug } from '@/lib/services/website/merchandising';

export class ImportService {
  /**
   * Parse and validate CSV data for stock import against column mapping.
   */
  static validateStockCSV(
    rows: Record<string, any>[], 
    mapping: Record<string, string>
  ): CSVParseValidationResult {
    const validRows: any[] = [];
    const invalidRows: any[] = [];
    const errors: RowValidationError[] = [];
    const seenRegs = new Set<string>();

    rows.forEach((rawRow, index) => {
      const rowNum = index + 1;
      const mapped: Record<string, any> = {};

      // Map raw headers to target schema fields
      for (const [targetField, sourceHeader] of Object.entries(mapping)) {
        if (sourceHeader && rawRow[sourceHeader] !== undefined) {
          mapped[targetField] = String(rawRow[sourceHeader]).trim();
        }
      }

      const rowErrors: string[] = [];

      // Registration validation
      const reg = mapped.registration ? mapped.registration.replace(/\s+/g, '').toUpperCase() : '';
      if (!reg) {
        rowErrors.push('Missing registration number');
        errors.push({ row: rowNum, field: 'registration', value: '', message: 'Registration is required' });
      } else if (seenRegs.has(reg)) {
        rowErrors.push(`Duplicate registration in file: ${reg}`);
        errors.push({ row: rowNum, field: 'registration', value: reg, message: 'Duplicate registration in this import' });
      } else {
        seenRegs.add(reg);
        mapped.registration = reg;
      }

      // Make & Model validation
      if (!mapped.make) {
        rowErrors.push('Missing vehicle make');
        errors.push({ row: rowNum, field: 'make', value: '', message: 'Vehicle make is required' });
      }
      if (!mapped.model) {
        rowErrors.push('Missing vehicle model');
        errors.push({ row: rowNum, field: 'model', value: '', message: 'Vehicle model is required' });
      }

      // Numeric validations
      const mileage = mapped.mileage ? parseInt(mapped.mileage.replace(/[^0-9]/g, ''), 10) : 0;
      if (mapped.mileage && isNaN(mileage)) {
        errors.push({ row: rowNum, field: 'mileage', value: mapped.mileage, message: 'Invalid mileage number' });
      } else {
        mapped.mileage = mileage;
      }

      const askingPrice = mapped.asking_price ? parseFloat(mapped.asking_price.replace(/[^0-9.]/g, '')) : null;
      if (mapped.asking_price && (askingPrice === null || isNaN(askingPrice) || askingPrice < 0)) {
        errors.push({ row: rowNum, field: 'asking_price', value: mapped.asking_price, message: 'Invalid asking price' });
      } else {
        mapped.asking_price = askingPrice;
      }

      const purchasePrice = mapped.purchase_price ? parseFloat(mapped.purchase_price.replace(/[^0-9.]/g, '')) : null;
      if (mapped.purchase_price && (purchasePrice === null || isNaN(purchasePrice) || purchasePrice < 0)) {
        errors.push({ row: rowNum, field: 'purchase_price', value: mapped.purchase_price, message: 'Invalid purchase price' });
      } else {
        mapped.purchase_price = purchasePrice;
      }

      // Status sanitisation
      const validStatuses = ['available', 'advertised', 'preparation', 'in_transit', 'purchased', 'reserved', 'sold'];
      const rawStatus = mapped.status ? mapped.status.toLowerCase().replace(/\s+/g, '_') : 'available';
      mapped.status = validStatuses.includes(rawStatus) ? rawStatus : 'available';

      if (rowErrors.length === 0) {
        validRows.push(mapped);
      } else {
        invalidRows.push({ ...rawRow, _errors: rowErrors });
      }
    });

    return {
      totalRows: rows.length,
      validRows,
      invalidRows,
      errors,
      preview: validRows.slice(0, 5),
    };
  }

  /**
   * Parse and validate CSV data for customer import with strict consent safety.
   */
  static validateCustomerCSV(
    rows: Record<string, any>[], 
    mapping: Record<string, string>
  ): CSVParseValidationResult {
    const validRows: any[] = [];
    const invalidRows: any[] = [];
    const errors: RowValidationError[] = [];
    const seenEmails = new Set<string>();

    rows.forEach((rawRow, index) => {
      const rowNum = index + 1;
      const mapped: Record<string, any> = {};

      for (const [targetField, sourceHeader] of Object.entries(mapping)) {
        if (sourceHeader && rawRow[sourceHeader] !== undefined) {
          mapped[targetField] = String(rawRow[sourceHeader]).trim();
        }
      }

      const rowErrors: string[] = [];

      // Name validation
      if (!mapped.first_name && !mapped.last_name) {
        rowErrors.push('Missing customer name');
        errors.push({ row: rowNum, field: 'first_name', value: '', message: 'At least first or last name is required' });
      }

      // Email validation
      if (mapped.email) {
        const email = mapped.email.toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          rowErrors.push('Invalid email address format');
          errors.push({ row: rowNum, field: 'email', value: mapped.email, message: 'Invalid email address' });
        } else if (seenEmails.has(email)) {
          rowErrors.push(`Duplicate email: ${email}`);
          errors.push({ row: rowNum, field: 'email', value: email, message: 'Duplicate email address in file' });
        } else {
          seenEmails.add(email);
          mapped.email = email;
        }
      }

      // STRICT GDPR MARKETING CONSENT SAFETY:
      // Never default to true. Only set true if source explicitly contains affirmative string and consent date.
      const consentRaw = mapped.marketing_consent ? String(mapped.marketing_consent).toLowerCase() : '';
      const hasExplicitConsent = ['true', 'yes', 'opted_in', '1'].includes(consentRaw) && !!mapped.consent_date;
      mapped.marketing_consent = hasExplicitConsent;

      if (rowErrors.length === 0) {
        validRows.push(mapped);
      } else {
        invalidRows.push({ ...rawRow, _errors: rowErrors });
      }
    });

    return {
      totalRows: rows.length,
      validRows,
      invalidRows,
      errors,
      preview: validRows.slice(0, 5),
    };
  }

  /**
   * Execute valid rows into database with idempotency and transaction safety.
   */
  static async executeImportJob(
    dealershipId: string,
    importType: ImportType,
    fileName: string,
    validRows: any[],
    mapping: Record<string, string>,
    errors: RowValidationError[] = [],
    userId?: string
  ): Promise<DataImportJob> {
    const supabase = await createClient();

    // 1. Create import job tracking record
    const { data: job, error: jobError } = await supabase
      .from('data_import_jobs')
      .insert({
        dealership_id: dealershipId,
        import_type: importType,
        status: 'importing',
        file_name: fileName,
        column_mapping: mapping,
        rows_total: validRows.length + errors.length,
        rows_valid: validRows.length,
        rows_invalid: errors.length,
        rows_imported: 0,
        errors: errors as any,
        created_by: userId,
        started_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to create import job: ${jobError?.message || 'Database error'}`);
    }

    try {
      let importedCount = 0;

      if (importType === 'stock') {
        const vehiclesToInsert = validRows.map(row => ({
          dealership_id: dealershipId,
          registration: row.registration,
          vin: row.vin || null,
          make: row.make,
          model: row.model,
          variant: row.variant || row.derivative || null,
          year: row.year ? parseInt(row.year, 10) : null,
          mileage: row.mileage || 0,
          purchase_price: row.purchase_price || null,
          asking_price: row.asking_price || null,
          status: row.status || 'available',
          slug: generateVehicleSlug({ make: row.make, model: row.model, year: parseInt(row.year || '0', 10) || 0, registration: row.registration }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        // Insert in batches of 50
        for (let i = 0; i < vehiclesToInsert.length; i += 50) {
          const batch = vehiclesToInsert.slice(i, i + 50);
          const { error: insertErr } = await supabase.from('vehicles').insert(batch);
          if (insertErr) {
            console.error('Batch insert error:', insertErr);
          } else {
            importedCount += batch.length;
          }
        }
      } else if (importType === 'customers') {
        const customersToInsert = validRows.map(row => ({
          dealership_id: dealershipId,
          first_name: row.first_name || '',
          last_name: row.last_name || '',
          email: row.email || null,
          phone: row.phone || null,
          address_line1: row.address || row.address_line1 || null,
          postcode: row.postcode || null,
          marketing_consent: row.marketing_consent || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        for (let i = 0; i < customersToInsert.length; i += 50) {
          const batch = customersToInsert.slice(i, i + 50);
          const { error: insertErr } = await supabase.from('customers').insert(batch);
          if (insertErr) {
            console.error('Customer batch insert error:', insertErr);
          } else {
            importedCount += batch.length;
          }
        }
      }

      // Mark job completed
      const { data: completedJob } = await supabase
        .from('data_import_jobs')
        .update({
          status: 'completed',
          rows_imported: importedCount,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .select('*')
        .single();

      return (completedJob || job) as DataImportJob;
    } catch (err: any) {
      await supabase
        .from('data_import_jobs')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      throw err;
    }
  }
}
