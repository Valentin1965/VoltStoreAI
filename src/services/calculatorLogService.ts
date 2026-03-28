import { supabase } from './supabase';

/** Snapshot of calculator inputs + computed summary (stored as JSON for CSV / admin). */
export type CalculatorRequestPayload = {
  monthlyKwh: number;
  backupHours: number;
  /** Calculator region key (e.g. denmark, sweden_south, sweden_north, norway_south, norway_north) */
  country?: string;
  notes?: string;
  /** Derived fields at time of calculation */
  dailyKwh?: number;
  hourlyKwh?: number;
  recommendedInverterPower?: number;
  recommendedBatteryCapacity?: number;
  recommendedSolarPanels?: number;
  estimatedCost?: number;
  recommendedProductIds?: string[];
};

/**
 * Fire-and-forget: logs one calculator run to Supabase (RPC log_calculator_request).
 * Fails silently if RPC/table missing (migration not applied).
 */
export function logCalculatorRequestToServer(
  payload: CalculatorRequestPayload,
  lang: string,
): void {
  void (async () => {
    try {
      const { error } = await supabase.rpc('log_calculator_request', {
        p_input: payload as unknown as Record<string, unknown>,
        p_lang: lang || 'da',
      });
      if (error) console.warn('[CalculatorLog]', error.message);
    } catch (e) {
      console.warn('[CalculatorLog]', e);
    }
  })();
}

export type CalculatorRequestRow = {
  id: string;
  created_at: string;
  input_json: CalculatorRequestPayload & Record<string, unknown>;
  lang: string | null;
};

export async function adminDeleteCalculatorRequest(
  adminKey: string,
  id: string,
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.rpc('admin_delete_calculator_request', {
      p_key: adminKey,
      p_id: id,
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function adminFetchCalculatorRequests(
  adminKey: string,
  limit = 500,
): Promise<{ data: CalculatorRequestRow[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('admin_get_calculator_requests', {
      p_key: adminKey,
      p_limit: limit,
    });
    if (error) return { data: null, error: error.message };
    return { data: (data as CalculatorRequestRow[]) ?? [], error: null };
  } catch (e: unknown) {
    return { data: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Build CSV with UTF-8 BOM for Excel; columns: id, created_at, lang, input_json */
export function calculatorRequestsToCsv(rows: CalculatorRequestRow[]): string {
  const esc = (cell: string) => `"${String(cell).replace(/"/g, '""')}"`;
  const header = ['id', 'created_at', 'lang', 'input_json'].map(esc).join(',');
  const lines = rows.map((r) =>
    [
      esc(r.id),
      esc(r.created_at),
      esc(r.lang ?? ''),
      esc(JSON.stringify(r.input_json ?? {})),
    ].join(','),
  );
  return '\ufeff' + header + '\n' + lines.join('\n');
}
