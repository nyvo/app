import { supabase } from '@/lib/supabase';
import { extractEdgeError } from '@/lib/edge-errors';

interface SendSupportMessageParams {
  subject: string;
  message: string;
  sellerId?: string | null;
  courseId?: string | null;
  signupId?: string | null;
}

export async function sendSupportMessage(
  params: SendSupportMessageParams,
): Promise<{ error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-support-message', {
      body: params,
    });

    if (error) {
      const { message } = await extractEdgeError(error);
      return { error: new Error(message || 'Kunne ikke sende meldingen.') };
    }

    if (data?.error) {
      return { error: new Error(data.error) };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Ukjent feil') };
  }
}
