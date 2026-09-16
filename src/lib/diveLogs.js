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
    const photos = await Promise.all((row.dive_log_photos || []).map(async (photo) => {
      const { data: signed, error: photoError } = await client.storage.from('dive-photos').createSignedUrl(photo.photo_path, 900)
      if (photoError) throw photoError
      return { ...photo, photo_url: signed.signedUrl }
    }))
    return { ...row, photo_url: data.signedUrl, photo_path: path, dive_log_photos: photos }
  }))
}

export async function createDiveLog({ userId, sightings, date, depth, latitude, longitude, locationName, visibility }) {
  const photos = await Promise.all(sightings.map(async (sighting) => ({
    photo_path: await uploadDivePhoto(userId, sighting.file),
    species: sighting.species.trim(),
  })))
  const client = requireSupabase()
  const cover = photos[0]
  const { data, error } = await client.from('dive_logs').insert({ user_id: userId, photo_url: cover.photo_path, photo_path: cover.photo_path, species: cover.species, dive_date: date, max_depth_m: depth, latitude, longitude, location_name: locationName, visibility }).select().single()
  if (error) throw error
  const { error: photosError } = await client.from('dive_log_photos').insert(photos.map((photo) => ({ ...photo, dive_log_id: data.id, user_id: userId })))
  if (photosError) throw photosError
  return (await signRows([{ ...data, dive_log_photos: photos }]))[0]
}

export async function listMyDiveLogs(userId) {
  const { data, error } = await requireSupabase().from('dive_logs').select('*, dive_log_photos(*)').eq('user_id', userId).order('dive_date', { ascending: false })
  if (error) throw error
  return signRows(data)
}

export async function listPublicDiveLogs() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('dive_logs')
    .select('*, dive_log_photos(*)')
    .eq('visibility', 'public')
    .order('like_count', { ascending: false })
    .order('comment_count', { ascending: false })
    .order('favorite_count', { ascending: false })
    .order('view_count', { ascending: false })
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
    .select('*, dive_log_photos(*)')
    .eq('user_id', userId)
    .eq('visibility', 'public')
    .order('dive_date', { ascending: false })
  if (error) throw error
  return signRows(data)
}

export async function recordDiveLogView(id) {
  const { error } = await requireSupabase().rpc('increment_dive_log_views', { log_id: id })
  if (error) throw error
}

export async function getDiveEngagement({ logId, userId }) {
  const client = requireSupabase()
  const [{ data: likes, error: likesError }, { data: favorites, error: favoritesError }, { data: comments, error: commentsError }] = await Promise.all([
    client.from('dive_log_likes').select('user_id').eq('dive_log_id', logId),
    client.from('dive_log_favorites').select('user_id').eq('dive_log_id', logId).eq('user_id', userId),
    client.from('dive_log_comments').select('*').eq('dive_log_id', logId).order('created_at', { ascending: true }),
  ])
  if (likesError || favoritesError || commentsError) throw likesError || favoritesError || commentsError
  const ids = [...new Set(comments.map((comment) => comment.user_id))]
  const { data: profiles, error: profileError } = ids.length ? await client.from('profiles').select('id, display_name, avatar_url').in('id', ids) : { data: [], error: null }
  if (profileError) throw profileError
  const byId = new Map(profiles.map((profile) => [profile.id, profile]))
  return { liked: likes.some((like) => like.user_id === userId), favorited: favorites.length > 0, comments: comments.map((comment) => ({ ...comment, profile: byId.get(comment.user_id) })) }
}

export async function toggleDiveLike({ logId, userId, liked }) {
  const client = requireSupabase()
  const query = liked ? client.from('dive_log_likes').delete().eq('dive_log_id', logId).eq('user_id', userId) : client.from('dive_log_likes').insert({ dive_log_id: logId, user_id: userId })
  const { error } = await query
  if (error) throw error
}
export async function toggleDiveFavorite({ logId, userId, favorited }) {
  const client = requireSupabase()
  const query = favorited ? client.from('dive_log_favorites').delete().eq('dive_log_id', logId).eq('user_id', userId) : client.from('dive_log_favorites').insert({ dive_log_id: logId, user_id: userId })
  const { error } = await query
  if (error) throw error
}
export async function addDiveComment({ logId, userId, body }) {
  const { data, error } = await requireSupabase().from('dive_log_comments').insert({ dive_log_id: logId, user_id: userId, body: body.trim() }).select().single()
  if (error) throw error
  return data
}
export async function listNotifications(userId) { const { data, error } = await requireSupabase().from('notifications').select('*').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(40); if (error) throw error; return data }
export async function markNotificationsRead(userId) { const { error } = await requireSupabase().from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', userId).is('read_at', null); if (error) throw error }

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
