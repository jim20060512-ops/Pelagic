import { requireSupabase } from './supabase'

export async function uploadDivePhoto(userId, file) {
  const client = requireSupabase()
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await client.storage.from('dive-photos').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return client.storage.from('dive-photos').getPublicUrl(path).data.publicUrl
}

export async function createDiveLog({ userId, photoFile, species, date, depth, latitude, longitude, locationName, visibility }) {
  const photoUrl = await uploadDivePhoto(userId, photoFile)
  const client = requireSupabase()
  const { data, error } = await client.from('dive_logs').insert({ user_id: userId, photo_url: photoUrl, species, dive_date: date, max_depth_m: depth, latitude, longitude, location_name: locationName, visibility }).select().single()
  if (error) throw error
  return data
}

export async function listMyDiveLogs(userId) {
  const { data, error } = await requireSupabase().from('dive_logs').select('*').eq('user_id', userId).order('dive_date', { ascending: false })
  if (error) throw error
  return data
}

export async function listPublicDiveLogs() {
  const { data, error } = await requireSupabase()
    .from('dive_logs')
    .select('*, profiles(display_name, avatar_url)')
    .eq('visibility', 'public')
    .order('dive_date', { ascending: false })
    .limit(60)
  if (error) throw error
  return data
}

export async function getProfile(userId) {
  const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function saveProfile({ userId, displayName, bio, avatarUrl }) {
  const { data, error } = await requireSupabase().from('profiles').upsert({
    id: userId,
    display_name: displayName,
    bio,
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  }).select().single()
  if (error) throw error
  return data
}

export async function listProfilePublicLogs(userId) {
  const { data, error } = await requireSupabase()
    .from('dive_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('visibility', 'public')
    .order('dive_date', { ascending: false })
  if (error) throw error
  return data
}
