/**
 * Dashboard HTML served directly by an Express route, so it works on Vercel
 * without relying on static-file bundling of the /public folder.
 */
export const DASHBOARD_HTML = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Access Logger — Dashboard</title>
    <style>
      :root {
        --bg: #0f1115; --panel: #171a21; --border: #262b36;
        --text: #e6e8ee; --muted: #8b93a7; --accent: #4f8cff;
      }
      * { box-sizing: border-box; }
      body { margin: 0; font: 14px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: var(--bg); color: var(--text); }
      header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
      h1 { font-size: 18px; margin: 0; }
      .muted { color: var(--muted); }
      main { padding: 20px 24px; }
      .controls { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }
      input, button, select { background: var(--panel); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font: inherit; }
      button { cursor: pointer; }
      button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
      .stats { display: flex; gap: 20px; margin-bottom: 16px; flex-wrap: wrap; }
      .stat { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px 16px; }
      .stat b { font-size: 20px; display: block; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
      th { color: var(--muted); font-weight: 600; position: sticky; top: 0; background: var(--bg); }
      td.ua { max-width: 360px; color: var(--muted); font-size: 12px; word-break: break-all; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .empty { color: var(--muted); padding: 40px; text-align: center; }
      .note { margin-top: 24px; color: var(--muted); font-size: 12px; border-top: 1px solid var(--border); padding-top: 12px; }
    </style>
  </head>
  <body>
    <header>
      <h1>🛡️ Access Logger</h1>
      <span class="muted">log truy cập cho site của bạn</span>
    </header>
    <main>
      <div class="controls">
        <input id="ip" placeholder="Lọc theo IP (vd: 203.0)" />
        <input id="limit" type="number" value="200" style="width: 90px" title="Số dòng tối đa" />
        <button class="primary" id="refresh">Tải lại</button>
        <label class="muted"><input type="checkbox" id="auto" /> Tự động 5s</label>
      </div>
      <div class="stats">
        <div class="stat"><span class="muted">Tổng hiển thị</span><b id="s-count">0</b></div>
        <div class="stat"><span class="muted">IP duy nhất</span><b id="s-ips">0</b></div>
        <div class="stat"><span class="muted">Mới nhất</span><b id="s-last">—</b></div>
      </div>
      <table>
        <thead>
          <tr><th>Thời gian (VN)</th><th>IP</th><th>Khu vực (gần đúng)</th><th>Bản đồ</th><th>Trình duyệt</th><th>Hệ điều hành</th><th>Path</th><th>User-Agent</th></tr>
        </thead>
        <tbody id="rows"></tbody>
      </table>
      <div id="empty" class="empty" style="display: none">Chưa có log nào. Thử truy cập <span class="mono">/track</span> vài lần.</div>
      <p class="note">Thời gian hiển thị theo giờ Việt Nam (UTC+7). Vị trí là <b>khu vực gần đúng</b> ở mức thành phố/ISP (có thể lệch vài km đến vài chục km, đặc biệt với mạng di động/VPN) — <b>không phải địa chỉ chính xác</b> và không định danh một cá nhân. Link bản đồ chỉ trỏ tới khu vực ước lượng, dùng cho analytics/bảo mật trên site của chính bạn.</p>
    </main>
    <script>
      const $ = (id) => document.getElementById(id);
      let timer = null;
      function esc(s){return String(s==null?"":s).replace(/[&<>]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));}
      // Format an ISO timestamp in Vietnam time (Asia/Ho_Chi_Minh, UTC+7).
      function fmtVN(iso){
        try {
          return new Intl.DateTimeFormat("vi-VN",{ timeZone:"Asia/Ho_Chi_Minh", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false }).format(new Date(iso));
        } catch(e){ return iso; }
      }
      function fmtVNTime(iso){
        try {
          return new Intl.DateTimeFormat("vi-VN",{ timeZone:"Asia/Ho_Chi_Minh", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false }).format(new Date(iso));
        } catch(e){ return ""; }
      }
      function geoText(g){
        if(!g) return "—";
        const parts = [g.city, g.region, g.country].filter(Boolean);
        return parts.length ? parts.join(", ") : "—";
      }
      function mapLink(g){
        if(!g) return "—";
        if(typeof g.lat==="number" && typeof g.lon==="number"){
          return '<a href="https://www.google.com/maps?q=' + g.lat + ',' + g.lon + '" target="_blank" rel="noopener">Xem khu vực</a>';
        }
        const parts = [g.city, g.region, g.country].filter(Boolean).join(", ");
        if(parts){
          return '<a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(parts) + '" target="_blank" rel="noopener">Xem khu vực</a>';
        }
        return "—";
      }
      async function load(){
        const ip = $("ip").value.trim();
        const limit = $("limit").value || 200;
        const params = new URLSearchParams({ limit });
        if (ip) params.set("ip", ip);
        try {
          const res = await fetch("/api/logs?" + params.toString());
          const data = await res.json();
          render(data.entries || []);
        } catch (e) { console.error(e); }
      }
      function render(entries){
        const rows = $("rows"); rows.innerHTML = "";
        $("empty").style.display = entries.length ? "none" : "block";
        const ips = new Set();
        for (const e of entries){
          ips.add(e.ip);
          const g = e.geo;
          const ispLine = g && g.isp ? '<div class="muted" style="font-size:11px">' + esc(g.isp) + "</div>" : "";
          const tr = document.createElement("tr");
          tr.innerHTML =
            '<td class="mono">' + esc(fmtVN(e.timestamp)) + "</td>" +
            '<td class="mono">' + esc(e.ip) + "</td>" +
            "<td>" + esc(geoText(g)) + ispLine + "</td>" +
            "<td>" + mapLink(g) + "</td>" +
            "<td>" + esc(e.browser) + "</td>" +
            "<td>" + esc(e.os) + "</td>" +
            '<td class="mono">' + esc(e.path) + "</td>" +
            '<td class="ua">' + esc(e.userAgent) + "</td>";
          rows.appendChild(tr);
        }
        $("s-count").textContent = entries.length;
        $("s-ips").textContent = ips.size;
        $("s-last").textContent = entries.length ? fmtVNTime(entries[0].timestamp) : "—";
      }
      $("refresh").addEventListener("click", load);
      $("ip").addEventListener("keydown", (e)=>{ if(e.key==="Enter") load(); });
      $("auto").addEventListener("change", (e)=>{ if(e.target.checked) timer=setInterval(load,5000); else clearInterval(timer); });
      load();
    </script>
  </body>
</html>`;
