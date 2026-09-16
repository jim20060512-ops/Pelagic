import { requireSupabase } from './supabase'

export async function uploadDivePhoto(userId, file) {
  const client = requireSupabase()
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await client.storage.from('dive-photos').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return path
}

async function signRows(rows) {
  const client = requireSupabase()
  return Promise.all(rows.map(async (row) => {
    const path = row.photo_path || row.photo_url
    const { data, error } = await client.storage.from('dive-photos').createSignedUrl(path, 900)
    if (error) throw error
    return { ...row, photo_url: data.signedUrl, photo_path: path }
  }))
}

export async function createDiveLog({ userId, photoFile, species, date, depth, latitude, longitude, locationName, visibility }) {
  const photoPath = await uploadDivePhoto(userId, photoFile)
  const client = requireSupabase()
  const { data, error } = await client.from('dive_logs').insert({ user_id: userId, photo_url: photoPath, photo_path: photoPath, species, dive_date: date, max_depth_m: depth, latitude, longitude, location_name: locationName, visibility }).select().single()
  if (error) throw error
  return (await signRows([data]))[0]
}

export async function listMyDiveLogs(userId) {
  const { data, error } = await requireSupabase().from('dive_logs').select('*').eq('user_id', userId).order('dive_date', { ascending: false })
  if (error) throw error
  return signRows(data)
}

export async function listPublicDiveLogs() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('dive_logs')
    .select('*')
    .eq('visibility', 'public')
    .order('dive_date', { ascending: false })
    .limit(60)
  if (error) throw error
  const ids = [...new Set(data.map((row) => row.user_id))]
  const { data: profiles, error: profileError } = await client.from('profiles').select('id, display_name, avatar_url').in('id', ids)
  if (profileError) throw profileError
  const byId = new Map(profiles.map((profile) => [profile.id, profile]))
  return (await signRows(data)).map((row) => ({ ...row, profiles: byId.get(row.user_id) || null }))
}

export async function getProfile(userId) {
  const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function updateDiveLog({ id, species, date, depth, latitude, longitude, locationName, visibility }) {
  const { data, error } = await requireSupabase().from('dive_logs').update({ species, dive_date: date, max_depth_m: depth, latitude, longitude, location_name: locationName, visibility }).eq('id', id).select().single()
  if (error) throw error
  return (await signRows([data]))[0]
}

export async function deleteDiveLog(id) {
  const { error } = await requireSupabase().from('dive_logs').delete().eq('id', id)
  if (error) throw error
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
  return signRows(data)
}

export async function listFollowing(userId) {
  const { data, error } = await requireSupabase().from('follows').select('following_id').eq('follower_id', userId)
  if (error) throw error
  return data.map((row) => row.following_id)
}

export async function followDiver({ followerId, followingId }) {
  const { error } = await requireSupabase().from('follows').insert({ follower_id: followerId, following_id: followingId })
  if (error) throw error
}

export async function unfollowDiver({ followerId, followingId }) {
  const { error } = await requireSupabase().from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId)
  if (error) throw error
}
