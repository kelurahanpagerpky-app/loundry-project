/**
 * MHC-Laundry — Shared Layout
 * Merender sidebar & topbar yang konsisten di semua halaman,
 * supaya navigasi antar-halaman benar-benar berfungsi.
 */
(function (window) {
  "use strict";

  const NAV_ITEMS = [
    { href: "dashboard.html", icon: "dashboard", label: "Dashboard" },
    { href: "pesanan.html?new=1", icon: "add_shopping_cart", label: "Pesanan Baru" },
    { href: "pesanan.html", icon: "list_alt", label: "Daftar Pesanan" },
    { href: "pelanggan.html", icon: "groups", label: "Manajemen Pelanggan" },
    { href: "layanan.html", icon: "local_laundry_service", label: "Layanan & Harga" },
    { href: "laporan.html", icon: "assessment", label: "Laporan Keuangan" },
    { href: "pengaturan.html", icon: "settings", label: "Pengaturan" },
  ];

  function currentFile() {
    const path = window.location.pathname.split("/").pop() || "dashboard.html";
    return path;
  }

  function render(activeFile) {
    const session = LL.getSession();
    const mount = document.getElementById("ll-layout-root");
    if (!mount) return;

    const active = activeFile || currentFile();

    const navHtml = NAV_ITEMS.map((item) => {
      const itemFile = item.href.split("?")[0];
      const isActive = itemFile === active;
      const activeClasses = "text-white bg-cyan-500/10 border-r-4 border-[#00bcd4]";
      const inactiveClasses = "text-slate-400 hover:text-white hover:bg-white/5 border-r-4 border-transparent";
      return `
        <a href="${item.href}" class="${isActive ? activeClasses : inactiveClasses} px-6 py-3 flex items-center gap-3 transition-colors duration-150">
          <span class="material-symbols-outlined text-[20px]">${item.icon}</span>
          <span class="text-sm font-medium">${item.label}</span>
        </a>`;
    }).join("");

    mount.innerHTML = `
      <div class="flex min-h-screen bg-[#020617] text-slate-200">
        <!-- Mobile overlay -->
        <div id="ll-overlay" class="fixed inset-0 bg-black/60 z-30 hidden lg:hidden"></div>

        <!-- Sidebar -->
        <aside id="ll-sidebar" class="fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#0d1c2d] border-r border-white/5 flex flex-col -translate-x-full lg:translate-x-0 transition-transform duration-200">
          <div class="flex items-center gap-3 px-6 py-5 border-b border-white/5">
            <div class="w-10 h-10 bg-[#00bcd4] rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
              <span class="material-symbols-outlined text-white">local_laundry_service</span>
            </div>
            <div class="min-w-0">
              <p class="font-bold text-white leading-tight truncate">MHC-Laundry</p>
              <p class="text-[11px] text-slate-400 truncate">Bersih, Cepat &amp; Terpercaya</p>
            </div>
          </div>
          <a href="pengaturan.html" id="ll-conn-badge" class="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium border transition-colors"></a>
          <nav class="flex-1 py-4 space-y-1 overflow-y-auto">${navHtml}</nav>
          <div class="p-4 border-t border-white/5">
            <div class="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/5">
              <div class="w-9 h-9 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-semibold text-sm shrink-0">
                ${(session && session.name ? session.name[0] : "?").toUpperCase()}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-white truncate">${session ? session.name : "Tamu"}</p>
                <p class="text-[11px] text-slate-400 truncate">${session ? session.role : ""}</p>
              </div>
              <button id="ll-logout" title="Keluar" class="text-slate-400 hover:text-red-400 transition-colors">
                <span class="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </div>
          </div>
        </aside>

        <!-- Main column -->
        <div class="flex-1 min-w-0 flex flex-col">
          <header class="sticky top-0 z-20 bg-[#020617]/90 backdrop-blur border-b border-white/5 px-4 sm:px-6 py-3 flex items-center gap-4">
            <button id="ll-menu-btn" class="lg:hidden text-slate-300 hover:text-white">
              <span class="material-symbols-outlined">menu</span>
            </button>
            <h1 id="ll-page-title" class="text-lg font-semibold text-white flex-1 truncate"></h1>
            <div id="ll-page-actions" class="flex items-center gap-2"></div>
          </header>
          <main id="ll-page-content" class="flex-1 p-4 sm:p-6"></main>
        </div>
      </div>
    `;

    const cfg = LL.getConfig();
    const badge = document.getElementById("ll-conn-badge");
    if (badge) {
      if (cfg.mode === "remote" && cfg.webAppUrl) {
        badge.className = "mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-colors";
        badge.innerHTML = '<span class="material-symbols-outlined text-[16px]">cloud_done</span> Tersambung ke Google Sheets';
      } else {
        badge.className = "mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium border bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 transition-colors";
        badge.innerHTML = '<span class="material-symbols-outlined text-[16px]">storage</span> Mode Lokal (Demo)';
      }
    }

    const menuBtn = document.getElementById("ll-menu-btn");
    const sidebar = document.getElementById("ll-sidebar");
    const overlay = document.getElementById("ll-overlay");
    function openSidebar() {
      sidebar.classList.remove("-translate-x-full");
      overlay.classList.remove("hidden");
    }
    function closeSidebar() {
      sidebar.classList.add("-translate-x-full");
      overlay.classList.add("hidden");
    }
    if (menuBtn) menuBtn.addEventListener("click", openSidebar);
    if (overlay) overlay.addEventListener("click", closeSidebar);

    const logoutBtn = document.getElementById("ll-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (confirm("Keluar dari MHC-Laundry?")) {
          LL.logout();
          window.location.href = "index.html";
        }
      });
    }
  }

  function setTitle(title) {
    const el = document.getElementById("ll-page-title");
    if (el) el.textContent = title;
  }

  function setActions(html) {
    const el = document.getElementById("ll-page-actions");
    if (el) el.innerHTML = html;
  }

  function toast(message, type) {
    let holder = document.getElementById("ll-toast-holder");
    if (!holder) {
      holder = document.createElement("div");
      holder.id = "ll-toast-holder";
      holder.className = "fixed bottom-4 right-4 z-50 flex flex-col gap-2";
      document.body.appendChild(holder);
    }
    const colors = {
      success: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
      error: "bg-red-500/15 border-red-500/40 text-red-300",
      info: "bg-cyan-500/15 border-cyan-500/40 text-cyan-300",
    };
    const el = document.createElement("div");
    el.className = `border ${colors[type] || colors.info} rounded-lg px-4 py-3 text-sm shadow-lg backdrop-blur bg-[#0d1c2d]/95 animate-[fadeIn_.15s_ease]`;
    el.textContent = message;
    holder.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity .3s";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 300);
    }, 2600);
  }

  window.LLLayout = { render, setTitle, setActions, toast, NAV_ITEMS };
})(window);
