import { supabase } from '@/lib/supabase';
import { extractEdgeError } from '@/lib/edge-errors';
import { friendlyError } from '@/lib/error-messages';

const FALLBACK_MESSAGE = 'Kunne ikke sende meldingen.';

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
      // The edge function's error strings are English — translate before the UI.
      const { message } = await extractEdgeError(error);
      return { error: new Error(friendlyError(message, FALLBACK_MESSAGE)) };
    }

    if (data?.error) {
      return { error: new Error(friendlyError(data.error, FALLBACK_MESSAGE)) };
    }

    return { error: null };
  } catch (err) {
    return { error: new Error(friendlyError(err, FALLBACK_MESSAGE)) };
  }
}
