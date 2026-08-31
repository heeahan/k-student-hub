import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { json, options } from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return options();
  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
  const { data, error } = await anon.auth.getUser();
  if (error || !data.user) return json({ error: 'Unauthorized' }, 401);
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return json({ error: 'Could not delete account' }, 500);
  return json({ deleted: true });
});
