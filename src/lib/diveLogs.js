import { requireSupabase } from './supabase'

export async function uploadDivePhoto(userId, file) {
  const client = requireSupabase()
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await client.storage.from('dive-photos').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return client.storage.from('dive-photos').getPublicUrl(path).data.publicUrl
}

export async function createDiveLog({ userId, photoFile, species, date, depth, latitude, longitude, locationName }) {
  const photoUrl = await uploadDivePhoto(userId, photoFile)
  const client = requireSupabase()
  const { data, error } = await client.from('dive_logs').insert({ user_id: userId, photo_url: photoUrl, species, dive_date: date, max_depth_m: depth, latitude, longitude, location_name: locationName }).select().single()
  if (error) throw error
  return data
}

export async function listMyDiveLogs(userId) {
  const { data, error } = await requireSupabase().from('dive_logs').select('*').eq('user_id', userId).order('dive_date', { ascending: false })
  if (error) throw error
  return data
}
