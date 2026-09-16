import { useEffect, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { divIcon } from "leaflet";
import {
  Check,
  Compass,
  FileImage,
  Fish,
  Home,
  Map,
  MapPin,
  Plus,
  Send,
  Sparkles,
  UserRound,
  ArrowLeft,
  Heart,
  Bookmark,
  MessageCircle,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import {
  addDiveComment,
  createDiveLog,
  deleteDiveLog,
  followDiver,
  getProfile,
  getDiveEngagement,
  listMyDiveLogs,
  listProfilePublicLogs,
  listFollowing,
  listPublicDiveLogs,
  recordDiveLogView,
  saveProfile,
  unfollowDiver,
  toggleDiveFavorite,
  toggleDiveLike,
  updateDiveLog,
} from "./lib/diveLogs";

const blank = () => ({
  image: "",
  species: "",
  date: new Date().toISOString().slice(0, 10),
  depth: "",
  lat: null,
  lng: null,
  locationName: "",
  visibility: "private",
  sightings: [],
});
async function reversePlace(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1&accept-language=zh-TW`;
  const d = await (await fetch(url)).json();
  const a = d.address || {};
  return (
    d.name ||
    a.island ||
    a.village ||
    a.town ||
    a.city ||
    a.municipality ||
    a.county ||
    a.state ||
    a.country ||
    "附近海域"
  );
}

export default function App() {
  const [view, setView] = useState("log"),
    [step, setStep] = useState(0),
    [draft, setDraft] = useState(blank),
    [logs, setLogs] = useState([]),
    [notice, setNotice] = useState(""),
    [session, setSession] = useState(null),
    [authOpen, setAuthOpen] = useState(false),
    [authEmail, setAuthEmail] = useState(""),
    [authBusy, setAuthBusy] = useState(false),
    [profile, setProfile] = useState(null),
    [publicLogs, setPublicLogs] = useState([]),
    [profileOwner, setProfileOwner] = useState(null),
    [following, setFollowing] = useState([]),
    [editLog, setEditLog] = useState(null),
    [mapFocus, setMapFocus] = useState(null),
    [detailLog, setDetailLog] = useState(null);
  const navigate = (next) => { window.history.pushState({ view: next }, ""); setView(next); };
  useEffect(() => { const back = (event) => setView(event.state?.view || "log"); window.history.replaceState({ view: "log" }, ""); window.addEventListener("popstate", back); return () => window.removeEventListener("popstate", back); }, []);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) return;
    listMyDiveLogs(session.user.id)
      .then((rows) => setLogs(rows.map(toLog)))
      .catch(() => setNotice("無法讀取雲端日誌，請稍後再試"));
    getProfile(session.user.id)
      .then((row) => setProfile(row))
      .catch(() => setNotice("無法讀取個人檔案，請稍後再試"));
    listFollowing(session.user.id).then(setFollowing).catch(() => setNotice("無法讀取追蹤清單，請稍後再試"));
  }, [session]);
  useEffect(() => {
    if (!session) return;
    const profileId = new URLSearchParams(window.location.hash.slice(1)).get("profile");
    if (profileId) {
      setProfileOwner(profileId === session.user.id ? null : { id: profileId, profile: null });
      setView("profile");
    }
  }, [session]);
  const toggleFollow = async (personId) => {
    if (!session || personId === session.user.id) return;
    const isFollowing = following.includes(personId);
    try {
      if (isFollowing) {
        await unfollowDiver({ followerId: session.user.id, followingId: personId });
        setFollowing((ids) => ids.filter((id) => id !== personId));
        setNotice("已取消追蹤");
      } else {
        await followDiver({ followerId: session.user.id, followingId: personId });
        setFollowing((ids) => [...ids, personId]);
        setNotice("已開始追蹤這位潛水者");
      }
    } catch (error) { setNotice(`無法更新追蹤狀態：${error.message}`); }
  };
  useEffect(() => {
    if (!session || (view !== "explore" && view !== "map")) return;
    listPublicDiveLogs()
      .then((rows) => setPublicLogs(rows.map(toLog)))
      .catch(() => setNotice("無法讀取公開日誌，請稍後再試"));
  }, [session, view]);
  const add = async (sightings) => {
    if (!session) {
      setAuthOpen(true);
      setNotice("登入後才能把相片與日誌安全儲存到你的帳戶");
      return false;
    }
    try {
      const row = await createDiveLog({
        userId: session.user.id,
        sightings,
        date: draft.date,
        depth: draft.depth,
        latitude: draft.lat,
        longitude: draft.lng,
        locationName: draft.locationName,
        visibility: draft.visibility,
      });
      setLogs((x) => [toLog(row), ...x]);
      setDraft(blank());
      setNotice("這一潛已安全儲存到你的 Pelagic 日誌");
      setStep(0);
      setView("log");
      return true;
    } catch (error) {
      setNotice(`儲存失敗：${error.message || "請稍後再試"}`);
      return false;
    }
  };
  const signIn = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setNotice("雲端設定尚未完成，請稍後重試");
      return;
    }
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: { emailRedirectTo: window.location.origin },
    });
    setAuthBusy(false);
    setNotice(
      error
        ? `無法寄送登入連結：${error.message}`
        : "登入連結已寄到你的信箱；點擊後會回到 Pelagic。",
    );
    if (!error) setAuthOpen(false);
  };
  const signInWithGoogle = async () => {
    if (!supabase) {
      setNotice("雲端設定尚未完成，請稍後重試");
      return;
    }
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setAuthBusy(false);
      setNotice(`無法使用 Google 登入：${error.message}`);
    }
  };
  const title =
    view === "log"
      ? "Dive log"
      : view === "map"
        ? "全球潛點"
          : view === "new"
          ? "記錄這一潛"
          : view === "profile"
            ? "潛水者檔案"
          : view === "edit"
              ? "修改這一潛"
              : view === "detail"
                ? "潛水日誌"
                : "社群探索";
  const account = session ? (
    <button
      className="account-button"
      title={session.user.email}
      onClick={() => {
        setProfileOwner(null);
        setView("profile");
      }}
    >
      <span className="avatar">{initials(session.user.email)}</span>
      <span>我的檔案</span>
    </button>
  ) : (
    <button className="account-button" onClick={() => setAuthOpen((x) => !x)}>
      <UserRound />
      登入
    </button>
  );
  return (
    <main className="app-shell">
      <aside className="side-rail">
        <div className="wordmark">
          <span className="mark">P</span>
          <span>PELAGIC</span>
        </div>
        <nav>
          <Nav
            i={<Home />}
            t="日誌"
            a={view === "log"}
            f={() => navigate("log")}
          />
          <Nav
            i={<Map />}
            t="地圖"
            a={view === "map"}
            f={() => navigate("map")}
          />
          <Nav
            i={<Compass />}
            t="探索"
            a={view === "explore"}
            f={() => navigate("explore")}
          />
        </nav>
        <div className="rail-bottom">
          {session ? (
            <button className="avatar avatar-button" title="查看個人檔案" onClick={() => { setProfileOwner(null); navigate("profile"); }}>
              {initials(session.user.email)}
            </button>
          ) : (
            <button className="rail-login" onClick={() => setAuthOpen(true)}>
              <UserRound />
              登入
            </button>
          )}
        </div>
      </aside>
      <section className="content">
        <header className="topbar">
          <div>
            <p className="microcopy">你的潛水記憶</p>
            <h1>{title}</h1>
          </div>
          <div className="top-actions">
            {view !== "log" && <button className="back-button" onClick={() => window.history.back()}><ArrowLeft />返回日誌</button>}
            {account}
            <button
              className="new-dive"
              onClick={() => {
                navigate("new");
                setStep(0);
              }}
            >
              <Plus />
              記錄一潛
            </button>
          </div>
        </header>
        {authOpen && !session && (
          <form className="auth-panel" onSubmit={signIn}>
            <div>
              <h2>把每一潛存進自己的帳戶。</h2>
              <p>使用 Google 登入，不用密碼，也不受寄信額度影響。</p>
            </div>
            <button
              className="google-button"
              type="button"
              disabled={authBusy}
              onClick={signInWithGoogle}
            >
              使用 Google 登入
            </button>
            <label>
              EMAIL（備用登入）
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
            </label>
            <button className="primary-button" disabled={authBusy}>
              {authBusy ? "正在寄送…" : "寄送登入連結"}
            </button>
          </form>
        )}
        {notice && (
          <button className="toast" onClick={() => setNotice("")}>
            <Check />
            {notice}
          </button>
        )}
        {view === "log" && (
          <Log
            logs={logs}
            add={() => {
              navigate("new");
              setStep(0);
            }}
            loggedIn={!!session}
            profile={profile}
            openProfile={() => { setProfileOwner(null); navigate("profile"); }}
            edit={(log) => { setEditLog(log); navigate("edit"); }}
            openDetail={(log) => { setDetailLog(log); navigate("detail"); }}
          />
        )}{" "}
        {view === "new" && <New {...{ draft, setDraft, step, setStep, add }} />}
        {view === "edit" && editLog && <EditDive log={editLog} done={(next) => { setLogs((rows) => rows.map((row) => row.id === next.id ? toLog(next) : row)); setView("log"); setNotice("日誌已更新"); }} remove={async () => { await deleteDiveLog(editLog.id); setLogs((rows) => rows.filter((row) => row.id !== editLog.id)); setView("log"); setNotice("日誌已刪除"); }} />}
        {view === "map" && <World ownLogs={logs} publicLogs={publicLogs} following={following} focus={mapFocus} loggedIn={!!session} login={() => setAuthOpen(true)} openProfile={(owner) => { setProfileOwner(owner); navigate("profile"); }} />}{" "}
        {view === "explore" && <Explore logs={publicLogs} following={following} user={session?.user} loggedIn={!!session} login={() => setAuthOpen(true)} openMap={(log) => { setMapFocus(log); navigate("map"); }} openProfile={(owner) => { setProfileOwner(owner); navigate("profile"); }} openDetail={(log) => { setDetailLog(log); navigate("detail"); }} />}
        {view === "detail" && detailLog && <DiveDetail log={detailLog} user={session?.user} openProfile={(owner) => { setProfileOwner(owner); navigate("profile"); }} />}
        {view === "profile" && session && <ProfilePage currentUser={session.user} profile={profile} setProfile={setProfile} owner={profileOwner} ownLogs={logs} setNotice={setNotice} following={following} toggleFollow={toggleFollow} />}
      </section>
      <Mobile {...{ view, navigate }} />
    </main>
  );
}
function toLog(x) {
  return {
    id: x.id,
    userId: x.user_id,
    image: x.photo_url,
    species: x.species,
    photos: x.dive_log_photos || [],
    viewCount: x.view_count || 0,
    likeCount: x.like_count || 0,
    favoriteCount: x.favorite_count || 0,
    commentCount: x.comment_count || 0,
    date: x.dive_date,
    depth: x.max_depth_m,
    lat: x.latitude,
    lng: x.longitude,
    locationName: x.location_name,
    visibility: x.visibility,
    profile: x.profiles || null,
  };
}
function initials(email = "") {
  return email.split("@")[0].slice(0, 2).toUpperCase() || "我";
}
function Nav({ i, t, a, f }) {
  return (
    <button className={`nav-button ${a ? "active" : ""}`} onClick={f}>
      {i}
      <span>{t}</span>
    </button>
  );
}
function Log({ logs, add, loggedIn, profile, openProfile, edit, openDetail }) {
  return (
    <div>
      <section className="intro">
        <div>
          <p className="date-stamp">你的私人潛水冊</p>
          <h2>每一潛，都值得被記住。</h2>
          <p>把相片、深度和那一眼遇見的事物，收進你的海底足跡。</p>
        </div>
        <button className="text-link" onClick={add}>
          開始新紀錄 <span>→</span>
        </button>
      </section>
      {loggedIn && (
        <button className="profile-strip" onClick={openProfile}>
          <ProfileAvatar profile={profile} fallback="我" />
          <span><b>{profile?.display_name || "設定你的潛水者名字"}</b><small>{profile?.bio || "建立一張屬於你的潛水名片"}</small></span>
          <em>編輯檔案 →</em>
        </button>
      )}
      {!logs.length ? (
        <section className="empty-log">
          <div className="empty-mark">
            <Fish />
          </div>
          <h2>
            {loggedIn ? "你的第一頁還在等你。" : "登入後，開始你的第一頁。"}
          </h2>
          <p>選一張潛水照片，在地圖上選定潛點，開始建立只屬於你的海洋記憶。</p>
          <button className="primary-button" onClick={add}>
            <Plus />
            記錄第一潛
          </button>
        </section>
      ) : (
        <>
          <section className="stats-strip">
            <div>
              <span>已記錄</span>
              <strong>{logs.length}</strong>
              <small>dives</small>
            </div>
            <div>
              <span>遇見物種</span>
              <strong>{new Set(logs.map((x) => x.species)).size}</strong>
              <small>species</small>
            </div>
            <div>
              <span>最深一潛</span>
              <strong>{Math.max(...logs.map((x) => +x.depth || 0))}</strong>
              <small>metres</small>
            </div>
          </section>
          <section className="section-head">
            <h2>最近的潛水</h2>
          </section>
          <div className="log-grid">
            {logs.map((x) => (
              <article className="sighting-card" key={x.id}>
                <button className="photo-wrap photo-map-link" onClick={() => openDetail(x)}>
                  <img src={x.image} alt={`${x.species} 的水下照片`} />
                  <span className="depth-tag">{x.depth} m</span>
                  <span className="map-link-label">查看日誌</span>
                </button>
                <div className="sighting-copy">
                  <p className="card-date">{x.date}</p>
                  <h3>{x.species}</h3>
                  <p className="site">
                    <MapPin size={14} />
                    {x.locationName}
                  </p>
                  <p className="coordinates">{x.lat.toFixed(5)}, {x.lng.toFixed(5)}</p>
                  <button className="card-action" onClick={() => edit(x)}>修改這一潛</button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
function New({ draft, setDraft, step, setStep, add }) {
  const [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [address, setAddress] = useState(""),
    [sightings, setSightings] = useState([]),
    seq = useRef(0),
    last = useRef(0);
  const update = (k) => (e) => setDraft((x) => ({ ...x, [k]: e.target.value }));
  const photo = (e) => {
    const files = [...(e.target.files || [])];
    if (files.length) {
      setSightings(files.map((file) => ({ file, image: URL.createObjectURL(file), species: "" })));
      setStep(1);
    }
  };
  const pick = async ({ lat, lng }) => {
    const id = ++seq.current;
    setDraft((x) => ({ ...x, lat, lng, locationName: "" }));
    setLoading(true);
    const wait = Math.max(0, 1000 - (Date.now() - last.current));
    if (wait) await new Promise((r) => setTimeout(r, wait));
    last.current = Date.now();
    try {
      const locationName = await reversePlace(lat, lng);
      if (id === seq.current) setDraft((x) => ({ ...x, locationName }));
    } catch {
      if (id === seq.current)
        setDraft((x) => ({ ...x, locationName: "未命名潛點" }));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  };
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    await add(sightings);
    setSaving(false);
  };
  const locateAddress = async () => { if (!address.trim()) return; setLoading(true); try { const rows = await (await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh-TW&q=${encodeURIComponent(address)}`)).json(); if (rows[0]) { const lat = +rows[0].lat, lng = +rows[0].lon; setDraft((x) => ({ ...x, lat, lng, locationName: rows[0].display_name })); } } finally { setLoading(false); } };
  return (
    <div className="new-dive-flow">
      <div className="dive-meter">
        <span>NEW LOG</span>
        <div>
          {["選擇照片", "物種資料", "選擇潛點"].map((n, i) => (
            <span
              key={n}
              className={
                i === step ? "step-active" : i < step ? "step-done" : ""
              }
            >
              <i>{i < step ? <Check size={12} /> : `0${i + 1}`}</i>
              {n}
            </span>
          ))}
        </div>
      </div>
      {step === 0 && (
        <section className="upload-stage">
          <div className="stage-copy">
            <h2>這一潛，遇見了什麼？</h2>
            <p>一潛可記錄多個相遇；每張照片都能留下自己的物種名稱。</p>
            <label className="primary-button file-button">
              <FileImage />
              選擇這一潛的照片
              <input type="file" accept="image/*" multiple onChange={photo} />
            </label>
          </div>
          <div className="upload-photo upload-empty">
            <FileImage />
            <span>PHOTO / YOUR DIVE</span>
          </div>
        </section>
      )}
      {step === 1 && (
        <section className="identify-stage">
          <div className="sighting-photo-strip">{sightings.map((sighting, index) => <img key={sighting.image} src={sighting.image} alt={`第 ${index + 1} 張潛水照片`} />)}</div>
          <div className="identify-copy">
            <p className="microcopy">
              <Sparkles size={14} />
              辨識服務尚未連接
            </p>
            <h2>替每一次相遇，<br />留下名字。</h2>
            <div className="sighting-names">{sightings.map((sighting, index) => <label key={sighting.image}>照片 {index + 1} 的生物名稱<input placeholder="例如：玳瑁" value={sighting.species} onChange={(event) => setSightings((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, species: event.target.value } : row))} /></label>)}</div>
            <button
              className="primary-button"
              disabled={!sightings.length || sightings.some((sighting) => !sighting.species.trim())}
              onClick={() => setStep(2)}
            >
              <Check />
              確認名稱
            </button>
          </div>
        </section>
      )}
      {step === 2 && (
        <section className="details-stage">
          <div className="details-heading">
            <h2>
              在地圖上，
              <br />
              標記這一潛。
            </h2>
            <p>點選潛點後，系統會取得附近的實際地名；座標只用作地圖定位。</p>
          </div>
          <form onSubmit={save}>
            <label>
              日期
              <input type="date" value={draft.date} onChange={update("date")} />
            </label>
            <label>
              潛點名稱{" "}
              <span className="unit">
                {loading ? "正在取得地名…" : draft.locationName || "尚未選定"}
              </span>
            </label>
            <label>
              輸入地址／潛點以在地圖定位
              <span className="address-row"><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="例如：Green Island, Taiwan" /><button type="button" className="secondary-button" onClick={locateAddress} disabled={loading}>定位</button></span>
            </label>
            <Picker value={draft} onPick={pick} />
            <label>
              潛點名稱 <span className="unit">可自行修改</span>
              <input value={draft.locationName} onChange={update("locationName")} placeholder="例如：Blue Corner" required />
            </label>
            <p className="coordinates field-coordinates">{draft.lat === null ? "尚未選定座標" : `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}`}</p>
            <label>
              最大深度 <span className="unit">metres</span>
              <input
                type="number"
                min="0"
                value={draft.depth}
                onChange={update("depth")}
                required
              />
            </label>
            <label>
              日誌可見度
              <select value={draft.visibility} onChange={update("visibility")}>
                <option value="private">僅自己可見</option>
                <option value="public">公開至社群</option>
              </select>
              <span className="field-hint">公開後會出現在真實潛水者的探索頁與你的個人檔案。</span>
            </label>
            <button
              className="publish-button"
              disabled={draft.lat === null || loading || saving}
              type="submit"
            >
              <Send />
              {saving ? "正在儲存…" : "儲存這一潛"}
            </button>
            <p className="local-note">
              地名資料 © OpenStreetMap
              contributors；登入後相片與日誌會儲存在你的雲端帳戶。
            </p>
          </form>
        </section>
      )}
    </div>
  );
}
function EditDive({ log, done, remove }) {
  const [draft, setDraft] = useState({ species: log.species, date: log.date, depth: log.depth, lat: log.lat, lng: log.lng, locationName: log.locationName, visibility: log.visibility });
  const [saving, setSaving] = useState(false);
  const update = (key) => (event) => setDraft((value) => ({ ...value, [key]: event.target.value }));
  const pick = async ({ lat, lng }) => {
    setDraft((value) => ({ ...value, lat, lng }));
    try { const locationName = await reversePlace(lat, lng); setDraft((value) => ({ ...value, locationName })); } catch { /* retain edited name */ }
  };
  const save = async (event) => { event.preventDefault(); setSaving(true); try { done(await updateDiveLog({ id: log.id, ...draft })); } finally { setSaving(false); } };
  return <section className="edit-dive"><div className="details-heading"><h2>修正這一潛。</h2><p>物種、日期、潛點、座標、深度和可見度都可以更新。</p></div><form onSubmit={save} className="edit-form"><label>物種名稱<input required value={draft.species} onChange={update("species")} /></label><label>日期<input required type="date" value={draft.date} onChange={update("date")} /></label><label>潛點名稱<input required value={draft.locationName} onChange={update("locationName")} /></label><Picker value={draft} onPick={pick} /><p className="coordinates field-coordinates">{draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}</p><label>最大深度（metres）<input required min="0" type="number" value={draft.depth} onChange={update("depth")} /></label><label>日誌可見度<select value={draft.visibility} onChange={update("visibility")}><option value="private">僅自己可見</option><option value="public">公開至社群</option></select></label><div className="edit-actions"><button className="primary-button" disabled={saving}>{saving ? "正在儲存…" : "儲存修改"}</button><button className="delete-button" type="button" onClick={() => { if (window.confirm("確定要刪除這一潛嗎？此操作無法復原。")) remove(); }}>刪除日誌</button></div></form></section>;
}
function Picker({ value, onPick }) {
  function Click() {
    useMapEvents({ click: (e) => onPick(e.latlng) });
    return value.lat === null ? null : (
      <CircleMarker
        center={[value.lat, value.lng]}
        radius={9}
        pathOptions={{
          color: "#ffc383",
          fillColor: "#e69b55",
          fillOpacity: 1,
          weight: 2,
        }}
      />
    );
  }
  return (
    <div className="pick-map">
      <MapContainer center={[12, 12]} zoom={2} minZoom={2}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Click />
        <MapFlyTo target={value.lat === null ? null : { lat: value.lat, lng: value.lng }} />
      </MapContainer>
      <p>點一下地圖以標記潛點</p>
    </div>
  );
}
function Sites({ status }) {
  const [s, setS] = useState([]);
  const load = async (map) => {
    if (map.getZoom() < 7) {
      setS([]);
      status("放大地圖以載入該區域的公開潛點");
      return;
    }
    const b = map.getBounds();
    try {
      const q = `[out:json];node["sport"="scuba_diving"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});out 80;`;
      const d = await (
        await fetch(
          `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`,
        )
      ).json();
      setS(d.elements || []);
      status(`${d.elements?.length || 0} 個公開潛點 · OpenStreetMap 資料`);
    } catch {
      status("暫時無法取得公開潛點");
    }
  };
  useMapEvents({ moveend: (e) => load(e.target) });
  return s.map((x) => (
    <CircleMarker
      key={x.id}
      center={[x.lat, x.lon]}
      radius={7}
      pathOptions={{ color: "#ffc383", fillColor: "#e69b55", fillOpacity: 0.9 }}
    >
      <Popup>{x.tags?.name || "未命名潛點"}</Popup>
    </CircleMarker>
  ));
}
function World({ ownLogs, publicLogs, following, focus, loggedIn, login, openProfile }) {
  const [status, setStatus] = useState("放大地圖以載入該區域的公開潛點");
  const [layer, setLayer] = useState("mine");
  const [placeQuery, setPlaceQuery] = useState("");
  const [target, setTarget] = useState(null);
  const [searching, setSearching] = useState(false);
  const logs = layer === "mine" ? ownLogs : layer === "following" ? publicLogs.filter((log) => following.includes(log.userId)) : publicLogs;
  useEffect(() => { if (focus) { setLayer("public"); setTarget({ lat: focus.lat, lng: focus.lng }); } }, [focus]);
  const searchPlace = async (event) => { event.preventDefault(); if (!placeQuery.trim()) return; setSearching(true); try { const results = await (await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh-TW&q=${encodeURIComponent(placeQuery)}`)).json(); if (results[0]) setTarget({ lat: +results[0].lat, lng: +results[0].lon }); else setStatus("找不到這個地點，請換一個名稱再試"); } catch { setStatus("暫時無法搜尋地點"); } finally { setSearching(false); } };
  return (
    <section className="map-view">
      <div className="map-copy">
        <h2>
        世界很大，
        <br />
        留下你的潛水足跡。
        </h2>
        <p>以照片標記每一潛；點擊標記即可查看日誌與座標。</p>
        <form className="map-search" onSubmit={searchPlace}><label>搜尋地點<input value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} placeholder="例如：Green Island, Taiwan" /></label><button className="secondary-button" disabled={searching}>{searching ? "搜尋中…" : "查看地點"}</button></form>
        <div className="feed-switch map-switch" role="tablist"><button className={layer === "mine" ? "active" : ""} onClick={() => setLayer("mine")}>我的日誌 <span>{ownLogs.length}</span></button><button className={layer === "public" ? "active" : ""} onClick={() => setLayer("public")}>公開日誌 <span>{publicLogs.length}</span></button><button className={layer === "following" ? "active" : ""} onClick={() => setLayer("following")}>追蹤中 <span>{following.length}</span></button></div>
      </div>
      <div className="real-map">
        <MapContainer center={[12, 12]} zoom={2} minZoom={2}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Sites status={setStatus} />
          <MapFlyTo target={target} />
          {logs.map((x) => <PhotoMarker key={x.id} log={x} focused={focus?.id === x.id} openProfile={openProfile} />)}
        </MapContainer>
        <p className="map-status">{status}</p>
      </div>
      {!loggedIn && layer !== "mine" && <p className="map-login-note">登入後即可查看其他潛水者與追蹤中的公開日誌。 <button onClick={login}>登入</button></p>}
      {loggedIn && layer !== "mine" && !logs.length && <p className="map-login-note">{layer === "following" ? "你追蹤的人尚未公開日誌。" : "目前還沒有其他公開日誌。"}</p>}
    </section>
  );
}
function MapFlyTo({ target }) { const map = useMap(); useEffect(() => { if (target) map.flyTo([target.lat, target.lng], 11, { duration: 1 }); }, [map, target]); return null; }
function PhotoMarker({ log, focused, openProfile }) {
  const markerRef = useRef(null);
  useEffect(() => {
    if (!focused) return;
    const timer = window.setTimeout(() => markerRef.current?.openPopup(), 450);
    return () => window.clearTimeout(timer);
  }, [focused]);
  const icon = divIcon({ className: "map-photo-icon", iconSize: [74, 92], iconAnchor: [37, 88], popupAnchor: [0, -80], html: `<img src="${log.image}" alt=""><span>潛水日誌</span>` });
  return <Marker ref={markerRef} position={[log.lat, log.lng]} icon={icon}><Popup><div className="map-journal-popup"><div className="map-photo-gallery">{(log.photos.length ? log.photos : [{ photo_url: log.image, species: log.species }]).map((photo) => <img key={photo.id || photo.photo_url} src={photo.photo_url} alt={`${photo.species} 的水下照片`} />)}</div><strong>{log.species}</strong>{log.photos.length > 1 && <small>這一潛記錄了 {log.photos.length} 種相遇</small>}<span>{log.locationName}</span><small>{log.lat.toFixed(5)}, {log.lng.toFixed(5)} · {log.depth} m</small>{log.profile && <button className="popup-author-link" onClick={() => openProfile({ id: log.userId, profile: log.profile })}><ProfileAvatar profile={log.profile} fallback="潛" /><span>查看 {log.profile.display_name || "上傳者"} 的檔案</span></button>}</div></Popup></Marker>;
}
function ProfileAvatar({ profile, fallback }) {
  if (profile?.avatar_url) return <img className="profile-avatar" src={profile.avatar_url} alt="" />;
  return <span className="profile-avatar profile-avatar-fallback">{(profile?.display_name || fallback).slice(0, 2).toUpperCase()}</span>;
}
function Explore({ logs, following, user, loggedIn, login, openMap, openProfile, openDetail }) {
  const [feed, setFeed] = useState("all");
  const visibleLogs = feed === "following" ? logs.filter((log) => following.includes(log.userId)) : logs;
  return (
    <section className="explore-view">
      <div className="explore-copy"><h2>從真實的相遇，認識海底世界。</h2><p>這裡只會出現潛水者自己公開的日誌。</p><div className="feed-switch" role="tablist"><button className={feed === "all" ? "active" : ""} onClick={() => setFeed("all")}>全部公開日誌</button><button className={feed === "following" ? "active" : ""} onClick={() => setFeed("following")}>追蹤中 <span>{following.length}</span></button></div></div>
      {!visibleLogs.length ? <Empty following={feed === "following"} loggedIn={loggedIn} login={login} /> : <div className="log-grid">{visibleLogs.map((x) => <article className="sighting-card" key={x.id}>
        <button className="photo-wrap photo-map-link" onClick={() => { recordDiveLogView(x.id).catch(() => {}); openMap(x); }}><img src={x.image} alt={`${x.species} 的水下照片`} /><span className="depth-tag">{x.depth} m</span>{x.photos.length > 1 && <span className="photo-count">{x.photos.length} 張生物照片</span>}<span className="map-link-label">在地圖查看</span></button>
        <div className="sighting-copy"><p className="card-date">{x.date}</p><h3>{x.species}</h3><p className="site"><MapPin size={14} />{x.locationName}</p>
          <SocialActions log={x} user={user} openDetail={openDetail} />
          <button className="card-action" onClick={() => openDetail(x)}>查看完整日誌 →</button>
          <button className="author-link" onClick={() => openProfile({ id: x.userId, profile: x.profile })}><ProfileAvatar profile={x.profile} fallback="潛" /><span>上傳者：{x.profile?.display_name || "潛水者"}</span><span>查看檔案 →</span></button>
        </div>
      </article>)}</div>}
    </section>
  );
}
function SocialActions({ log, user, openDetail }) {
  const [state, setState] = useState({ liked: false, favorited: false, likes: log.likeCount, favorites: log.favoriteCount, comments: log.commentCount });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (user) getDiveEngagement({ logId: log.id, userId: user.id }).then((data) => setState((x) => ({ ...x, liked: data.liked, favorited: data.favorited, comments: data.comments.length || log.commentCount }))).catch(() => {}); }, [log.id, user?.id]);
  const like = async () => { if (!user || busy) return; setBusy(true); try { await toggleDiveLike({ logId: log.id, userId: user.id, liked: state.liked }); setState((x) => ({ ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) })); } finally { setBusy(false); } };
  const favorite = async () => { if (!user || busy) return; setBusy(true); try { await toggleDiveFavorite({ logId: log.id, userId: user.id, favorited: state.favorited }); setState((x) => ({ ...x, favorited: !x.favorited, favorites: x.favorites + (x.favorited ? -1 : 1) })); } finally { setBusy(false); } };
  return <div className="card-social" aria-label="日誌互動"><button aria-label="按讚" className={state.liked ? "is-active" : ""} disabled={busy} onClick={like}><Heart /> <span>{state.likes}</span></button><button aria-label="收藏" className={state.favorited ? "is-active" : ""} disabled={busy} onClick={favorite}><Bookmark /> <span>{state.favorites}</span></button><button aria-label="查看留言" onClick={() => openDetail(log)}><MessageCircle /> <span>{state.comments}</span></button></div>;
}
function DiveDetail({ log, user, openProfile }) {
  const [engagement, setEngagement] = useState({ liked: false, favorited: false, comments: [] });
  const [counts, setCounts] = useState({ likes: log.likeCount, favorites: log.favoriteCount, comments: log.commentCount });
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const isPublic = log.visibility === "public";
  useEffect(() => { if (user && isPublic) getDiveEngagement({ logId: log.id, userId: user.id }).then(setEngagement).catch(() => {}); }, [log.id, user?.id, isPublic]);
  const toggleLike = async () => { if (!user || busy) return; setBusy(true); try { await toggleDiveLike({ logId: log.id, userId: user.id, liked: engagement.liked }); setEngagement((x) => ({ ...x, liked: !x.liked })); setCounts((x) => ({ ...x, likes: x.likes + (engagement.liked ? -1 : 1) })); } finally { setBusy(false); } };
  const toggleFavorite = async () => { if (!user || busy) return; setBusy(true); try { await toggleDiveFavorite({ logId: log.id, userId: user.id, favorited: engagement.favorited }); setEngagement((x) => ({ ...x, favorited: !x.favorited })); setCounts((x) => ({ ...x, favorites: x.favorites + (engagement.favorited ? -1 : 1) })); } finally { setBusy(false); } };
  const submitComment = async (event) => { event.preventDefault(); if (!user || !comment.trim() || busy) return; setBusy(true); try { const row = await addDiveComment({ logId: log.id, userId: user.id, body: comment }); setEngagement((x) => ({ ...x, comments: [...x.comments, { ...row, profile: null }] })); setCounts((x) => ({ ...x, comments: x.comments + 1 })); setComment(""); } finally { setBusy(false); } };
  const photos = log.photos.length ? log.photos : [{ photo_url: log.image, species: log.species }];
  return <section className="dive-detail"><header className="detail-header"><div><p className="card-date">{log.date} · {log.depth} METRES</p><h2>{log.locationName}</h2><p>{photos.length} 張照片 · {photos.length} 次相遇</p></div>{log.profile && <button className="detail-author" onClick={() => openProfile({ id: log.userId, profile: log.profile })}><ProfileAvatar profile={log.profile} fallback="潛" /><span>上傳者<br /><b>{log.profile.display_name || "潛水者"}</b></span><em>查看檔案 →</em></button>}</header><div className="detail-gallery">{photos.map((photo) => <figure key={photo.id || photo.photo_url}><img src={photo.photo_url} alt={`${photo.species} 的水下照片`} /><figcaption>{photo.species}</figcaption></figure>)}</div><section className="detail-meta"><p><MapPin size={16} /> {log.locationName}</p><p>{log.lat.toFixed(5)}, {log.lng.toFixed(5)}</p></section>{isPublic && <section className="detail-interactions"><div><button aria-label="按讚這篇日誌" className={engagement.liked ? "is-active" : ""} disabled={busy} onClick={toggleLike}><Heart /> {counts.likes}</button><button aria-label="收藏這篇日誌" className={engagement.favorited ? "is-active" : ""} disabled={busy} onClick={toggleFavorite}><Bookmark /> {counts.favorites}</button><span><MessageCircle /> {counts.comments}</span></div><form onSubmit={submitComment}><label>留下留言<input maxLength="500" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="分享你在這個潛點的觀察…" /></label><button className="primary-button" disabled={!comment.trim() || busy}>發表</button></form><div className="comment-list">{!engagement.comments.length ? <p>還沒有留言。成為第一位留下觀察的人。</p> : engagement.comments.map((item) => <article key={item.id}><ProfileAvatar profile={item.profile} fallback={item.user_id === user?.id ? "我" : "潛"} /><div><b>{item.profile?.display_name || (item.user_id === user?.id ? "你" : "潛水者")}</b><p>{item.body}</p></div></article>)}</div></section>}</section>;
}
function Empty({ following = false, loggedIn = true, login }) { if (!loggedIn) return <section className="empty-log community-empty"><div className="empty-mark"><UserRound /></div><h2>登入後，查看真實潛水者的公開日誌。</h2><p>公開日誌只會提供給已登入的 Pelagic 使用者；登入後即可探索、開啟潛水者檔案與追蹤他們。</p><button className="primary-button" onClick={login}><UserRound />使用 Google 登入</button></section>; return <section className="empty-log community-empty"><div className="empty-mark"><UserRound /></div><h2>{following ? "你追蹤的人還沒有公開日誌。" : "社群會由真實的潛水者開始。"}</h2><p>{following ? "先在公開日誌裡追蹤潛水者；他們的新紀錄會出現在這裡。" : "目前沒有公開紀錄，因此不顯示虛構人物或假內容。"}</p></section>; }
function ProfilePage({ currentUser, profile, setProfile, owner, ownLogs, setNotice, following, toggleFollow }) {
  const isOwn = !owner || owner.id === currentUser.id;
  const [shownProfile, setShownProfile] = useState(isOwn ? profile : owner.profile);
  const [shownLogs, setShownLogs] = useState(isOwn ? ownLogs.filter((x) => x.visibility === "public") : []);
  const [form, setForm] = useState({ displayName: "", bio: "", avatarUrl: "" });
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (isOwn) { setShownProfile(profile); setShownLogs(ownLogs.filter((x) => x.visibility === "public")); return; }
    getProfile(owner.id).then(setShownProfile);
    listProfilePublicLogs(owner.id).then((rows) => setShownLogs(rows.map(toLog)));
  }, [isOwn, owner?.id, profile, ownLogs]);
  useEffect(() => setForm({ displayName: profile?.display_name || "", bio: profile?.bio || "", avatarUrl: profile?.avatar_url || "" }), [profile]);
  const save = async (e) => { e.preventDefault(); try { const saved = await saveProfile({ userId: currentUser.id, ...form }); setProfile(saved); setShownProfile(saved); setEditing(false); setNotice("個人檔案已儲存"); } catch (error) { setNotice(`無法儲存個人檔案：${error.message}`); } };
  const share = async () => { await navigator.clipboard.writeText(`${window.location.origin}#profile=${currentUser.id}`); setNotice("個人檔案連結已複製；朋友登入後即可開啟並追蹤你。"); };
  return <section className="profile-view"><div className="profile-hero"><ProfileAvatar profile={shownProfile} fallback={isOwn ? currentUser.email : "潛"} /><div><h2>{shownProfile?.display_name || (isOwn ? "為自己命名" : "潛水者")}</h2><p>{shownProfile?.bio || (isOwn ? "讓其他潛水者知道你在海裡尋找什麼。" : "這位潛水者還沒有留下簡介。")}</p></div>{isOwn ? <div className="profile-actions"><button className="secondary-button" onClick={() => setEditing((x) => !x)}>{editing ? "取消編輯" : "編輯檔案"}</button><button className="secondary-button" onClick={share}>複製個人連結</button><button className="signout-button" onClick={() => supabase.auth.signOut()}>登出</button></div> : <button className={`follow-button ${following.includes(owner.id) ? "is-following" : ""}`} onClick={() => toggleFollow(owner.id)}>{following.includes(owner.id) ? "追蹤中" : "追蹤這位潛水者"}</button>}</div>
    {editing && <form className="profile-form" onSubmit={save}><label>顯示名稱<input required maxLength="40" value={form.displayName} onChange={(e) => setForm((x) => ({...x, displayName:e.target.value}))} /></label><label>個人簡介<textarea maxLength="180" value={form.bio} onChange={(e) => setForm((x) => ({...x, bio:e.target.value}))} placeholder="例如：喜歡微距、珊瑚礁與夜潛。" /></label><label>頭像圖片網址<span className="field-hint">可留空，會使用你的名字縮寫。</span><input type="url" value={form.avatarUrl} onChange={(e) => setForm((x) => ({...x, avatarUrl:e.target.value}))} placeholder="https://…" /></label><button className="primary-button">儲存檔案</button></form>}
    <section className="section-head"><h2>{isOwn ? "我的公開日誌" : "公開日誌"}</h2></section>{!shownLogs.length ? <p className="profile-empty">還沒有公開日誌。</p> : <div className="log-grid">{shownLogs.map((x) => <article className="sighting-card" key={x.id}><div className="photo-wrap"><img src={x.image} alt={`${x.species} 的水下照片`} /><span className="depth-tag">{x.depth} m</span></div><div className="sighting-copy"><p className="card-date">{x.date}</p><h3>{x.species}</h3><p className="site"><MapPin size={14} />{x.locationName}</p></div></article>)}</div>}</section>;
}
function Mobile({ view, navigate }) {
  return (
    <nav className="mobile-nav">
      <Nav i={<Home />} t="日誌" a={view === "log"} f={() => navigate("log")} />
      <Nav i={<Map />} t="地圖" a={view === "map"} f={() => navigate("map")} />
      <Nav
        i={<Compass />}
        t="探索"
        a={view === "explore"}
        f={() => navigate("explore")}
      />
    </nav>
  );
}
