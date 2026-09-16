import { useEffect, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
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
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { createDiveLog, listMyDiveLogs } from "./lib/diveLogs";

const blank = () => ({
  image: "",
  species: "",
  date: new Date().toISOString().slice(0, 10),
  depth: "",
  lat: null,
  lng: null,
  locationName: "",
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
    [authBusy, setAuthBusy] = useState(false);
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
  }, [session]);
  const add = async (photoFile) => {
    if (!session) {
      setAuthOpen(true);
      setNotice("登入後才能把相片與日誌安全儲存到你的帳戶");
      return false;
    }
    try {
      const row = await createDiveLog({
        userId: session.user.id,
        photoFile,
        species: draft.species,
        date: draft.date,
        depth: draft.depth,
        latitude: draft.lat,
        longitude: draft.lng,
        locationName: draft.locationName,
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
  const title =
    view === "log"
      ? "Dive log"
      : view === "map"
        ? "全球潛點"
        : view === "new"
          ? "記錄這一潛"
          : "社群探索";
  const account = session ? (
    <button
      className="account-button"
      title={session.user.email}
      onClick={() => supabase.auth.signOut()}
    >
      <span className="avatar">{initials(session.user.email)}</span>
      <span>登出</span>
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
            f={() => setView("log")}
          />
          <Nav
            i={<Map />}
            t="地圖"
            a={view === "map"}
            f={() => setView("map")}
          />
          <Nav
            i={<Compass />}
            t="探索"
            a={view === "explore"}
            f={() => setView("explore")}
          />
        </nav>
        <div className="rail-bottom">
          {session ? (
            <div className="avatar" title={session.user.email}>
              {initials(session.user.email)}
            </div>
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
            {account}
            <button
              className="new-dive"
              onClick={() => {
                setView("new");
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
              <p>輸入 Email，我們會寄送一封一次性登入連結；不用記密碼。</p>
            </div>
            <label>
              EMAIL
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
              setView("new");
              setStep(0);
            }}
            loggedIn={!!session}
          />
        )}{" "}
        {view === "new" && <New {...{ draft, setDraft, step, setStep, add }} />}
        {view === "map" && <World logs={logs} />}{" "}
        {view === "explore" && <Empty />}
      </section>
      <Mobile
        {...{ view, setView }}
        add={() => {
          setView("new");
          setStep(0);
        }}
      />
    </main>
  );
}
function toLog(x) {
  return {
    id: x.id,
    image: x.photo_url,
    species: x.species,
    date: x.dive_date,
    depth: x.max_depth_m,
    lat: x.latitude,
    lng: x.longitude,
    locationName: x.location_name,
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
function Log({ logs, add, loggedIn }) {
  return (
    <div>
      <section className="intro">
        <div>
          <p className="date-stamp">你的私人潛水冊</p>
          <h2>每一潛，都值得被記住。</h2>
          <p>把相片、深度和那一眼遇見的生命，收進你的海底足跡。</p>
        </div>
        <button className="text-link" onClick={add}>
          開始新紀錄 <span>→</span>
        </button>
      </section>
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
                <div className="photo-wrap">
                  <img src={x.image} alt={`${x.species} 的水下照片`} />
                  <span className="depth-tag">{x.depth} m</span>
                </div>
                <div className="sighting-copy">
                  <p className="card-date">{x.date}</p>
                  <h3>{x.species}</h3>
                  <p className="site">
                    <MapPin size={14} />
                    {x.locationName}
                  </p>
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
    [photoFile, setPhotoFile] = useState(null),
    seq = useRef(0),
    last = useRef(0);
  const update = (k) => (e) => setDraft((x) => ({ ...x, [k]: e.target.value }));
  const photo = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setPhotoFile(f);
      setDraft((x) => ({ ...x, image: URL.createObjectURL(f) }));
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
    await add(photoFile);
    setSaving(false);
  };
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
            <p>選擇你自己的水下照片，從那一刻開始記錄。</p>
            <label className="primary-button file-button">
              <FileImage />
              從裝置選擇照片
              <input type="file" accept="image/*" onChange={photo} />
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
          <div className="identified-photo">
            <img src={draft.image} alt="你選擇的水下照片" />
          </div>
          <div className="identify-copy">
            <p className="microcopy">
              <Sparkles size={14} />
              辨識服務尚未連接
            </p>
            <h2>
              替這次相遇
              <br />
              留下名字。
            </h2>
            <label>
              生物名稱
              <input
                placeholder="例如：玳瑁"
                value={draft.species}
                onChange={update("species")}
              />
            </label>
            <button
              className="primary-button"
              disabled={!draft.species.trim()}
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
            <Picker value={draft} onPick={pick} />
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
function World({ logs }) {
  const [status, setStatus] = useState("放大地圖以載入該區域的公開潛點");
  return (
    <section className="map-view">
      <div className="map-copy">
        <h2>
        把每一段潛水足跡，
        <br />
        標在世界上。
        </h2>
        <p>公開潛點來自 OpenStreetMap；你的日誌會以橙色圓點標示。</p>
      </div>
      <div className="real-map">
        <MapContainer center={[12, 12]} zoom={2} minZoom={2}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Sites status={setStatus} />
          {logs.map((x) => (
            <CircleMarker
              key={x.id}
              center={[x.lat, x.lng]}
              radius={10}
              pathOptions={{
                color: "#e9f3f6",
                fillColor: "#e16f4e",
                fillOpacity: 1,
              }}
            >
              <Popup>
                <strong>{x.species}</strong>
                <br />
                {x.locationName}
                <br />
                {x.depth} m
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
        <p className="map-status">{status}</p>
      </div>
    </section>
  );
}
function Empty() {
  return (
    <section className="empty-log community-empty">
      <div className="empty-mark">
        <UserRound />
      </div>
      <h2>社群會由真實的潛水者開始。</h2>
      <p>目前沒有公開紀錄，因此不顯示虛構人物或假內容。</p>
    </section>
  );
}
function Mobile({ view, setView, add }) {
  return (
    <nav className="mobile-nav">
      <Nav i={<Home />} t="日誌" a={view === "log"} f={() => setView("log")} />
      <Nav i={<Map />} t="地圖" a={view === "map"} f={() => setView("map")} />
      <button className="add-button" onClick={add}>
        <Plus />
      </button>
      <Nav
        i={<Compass />}
        t="探索"
        a={view === "explore"}
        f={() => setView("explore")}
      />
    </nav>
  );
}
