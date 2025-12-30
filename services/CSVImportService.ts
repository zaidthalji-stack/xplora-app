import { supabase } from '@/supabase/client';

export interface PropertyCSVRow {
  Property_ID: string;
  Transaction_Type: string;
  Price: string;
  Location: string;
  District: string;
  Community: string;
  Property_Type: string;
  'Off-Plan_Status': string;
  Bedrooms: string;
  Bathrooms: string;
  'Property_Size_(sqft)': string;
  Furnishing: string;
  Features: string;
  Building_Name: string;
  Developer: string;
  Building_Rating: string;
  Date_Listed: string;
  'Entry/Exit Points': string;
  Nearest_Mall: string;
  Nearest_Metro: string;
  Number_of_Visits: string;
  Agent_Name: string;
  Agent_License: string;
  Agency_Name: string;
  DLD_Permit_Number: string;
  Agent_Phone: string;
  Agency_Address: string;
  Image_URL: string;
  Floor_Plan_URL: string;
  Latitude: string;
  Longitude: string;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; error: string }>;
}

export class CSVImportService {
  static parseCSV(csvContent: string): PropertyCSVRow[] {
    const lines = csvContent.trim().split('\n');
    const headers = this.parseCSVLine(lines[0]);
    const rows: PropertyCSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);

      if (values.length !== headers.length) {
        console.warn(`Row ${i} has ${values.length} columns, expected ${headers.length}. Skipping.`);
        continue;
      }

      const row: any = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });

      const lat = parseFloat(row.Latitude);
      const lng = parseFloat(row.Longitude);

      if (isNaN(lat) || isNaN(lng) || lat < 24 || lat > 26 || lng < 54 || lng > 56) {
        console.warn(`Row ${i} has invalid coordinates: lat=${row.Latitude}, lng=${row.Longitude}. Skipping.`);
        continue;
      }

      rows.push(row as PropertyCSVRow);
    }

    console.log(`Parsed ${rows.length} valid rows out of ${lines.length - 1} total rows`);
    return rows;
  }

  private static parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          currentValue += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    values.push(currentValue);
    return values;
  }

  static transformRowToDBFormat(row: PropertyCSVRow) {
    return {
      Property_ID: row.Property_ID,
      Transaction_Type: row.Transaction_Type,
      Price: row.Price ? parseFloat(row.Price) : null,
      Location: row.Location,
      District: row.District ? parseInt(row.District) : null,
      Community: row.Community,
      Property_Type: row.Property_Type,
      Off_Plan_Status: row['Off-Plan_Status'],
      Bedrooms: row.Bedrooms ? parseInt(row.Bedrooms) : null,
      Bathrooms: row.Bathrooms ? parseFloat(row.Bathrooms) : null,
      Property_Size_sqft: row['Property_Size_(sqft)'] ? parseInt(row['Property_Size_(sqft)']) : null,
      Furnishing: row.Furnishing,
      Features: row.Features,
      Building_Name: row.Building_Name,
      Developer: row.Developer,
      Building_Rating: row.Building_Rating ? parseInt(row.Building_Rating) : null,
      Date_Listed: row.Date_Listed,
      Entry_Exit_Points: row['Entry/Exit Points'] ? parseInt(row['Entry/Exit Points']) : null,
      Nearest_Mall: row.Nearest_Mall,
      Nearest_Metro: row.Nearest_Metro,
      Number_of_Visits: row.Number_of_Visits ? parseInt(row.Number_of_Visits) : 0,
      Agent_Name: row.Agent_Name,
      Agent_License: row.Agent_License,
      Agency_Name: row.Agency_Name,
      DLD_Permit_Number: row.DLD_Permit_Number ? parseInt(row.DLD_Permit_Number) : null,
      Agent_Phone: row.Agent_Phone,
      Agency_Address: row.Agency_Address,
      Image_URL: row.Image_URL,
      Floor_Plan_URL: row.Floor_Plan_URL,
      Latitude: row.Latitude ? parseFloat(row.Latitude) : null,
      Longitude: row.Longitude ? parseFloat(row.Longitude) : null,
    };
  }

  static async importProperties(
    csvContent: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      totalRows: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
    };

    try {
      const rows = this.parseCSV(csvContent);
      result.totalRows = rows.length;

      console.log(`Starting import of ${rows.length} properties`);

      if (rows.length > 0) {
        const firstRow = rows[0];
        console.log('Sample row:', {
          Property_ID: firstRow.Property_ID,
          Location: firstRow.Location,
          Latitude: firstRow.Latitude,
          Longitude: firstRow.Longitude,
        });
      }

      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const transformedBatch = batch.map((row) => this.transformRowToDBFormat(row));

        console.log(`Importing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rows.length / batchSize)}`);

        const { error } = await supabase
          .from('properties_data')
          .upsert(transformedBatch, { onConflict: 'Property_ID' });

        if (error) {
          console.error('Batch import error:', error.message);
          result.errorCount += batch.length;
          result.errors.push({
            row: i,
            error: error.message,
          });
        } else {
          result.successCount += batch.length;
        }

        if (onProgress) {
          onProgress(Math.min(i + batchSize, rows.length), rows.length);
        }
      }

      result.success = result.errorCount === 0;
      console.log(`Import complete: ${result.successCount} success, ${result.errorCount} errors`);
    } catch (error: any) {
      console.error('Import failed:', error);
      result.errors.push({
        row: 0,
        error: error.message || 'Unknown error during import',
      });
    }

    return result;
  }

  static async clearAllProperties(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('properties_data')
        .delete()
        .neq('Property_ID', '');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getPropertiesCount(): Promise<number> {
    const { count, error } = await supabase
      .from('properties_data')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error getting count:', error);
      return 0;
    }

    return count || 0;
  }
}
