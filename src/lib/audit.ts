import { supabase } from '@/lib/supabase';

export async function logAction(
  action: string,
  entityType: string = '',
  entityId: string | null = null,
  description: string = ''
) {
  try {
    await supabase.rpc('log_action', {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_description: description,
    });
  } catch {
    // Silent fail — audit logging should not break user flows
  }
}
