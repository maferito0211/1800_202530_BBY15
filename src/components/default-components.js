class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <footer>
      <a id="forumIcon" href="./forum-main.html">
        <img src="./images/forum.gif" alt="Forum Icon" />
      </a>
      <a id="mapIcon" href="./map.html">
        <img src="./images/maps.gif" alt="Map Icon" />
      </a>
      <a id="profileIcon" href="./loginPage.html">
        <img src="./images/profile.gif" alt="Profile Icon" />
      </a>
    </footer>
        `;
  }
}

customElements.define("site-footer", SiteFooter);

class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
        <nav>
          <div id="header-left-section">
            <div>
              <button id="menuButton">☰</button>
            </div>

            <!-- Logo container (click handler added below with JS) -->
            <a id="logoContainer">
              <img id="logo" src="./images/logoImg.png" alt="Site Logo" />
            </a>

          </div>
          <div id="pageTitleSection"></div>
          <div></div>
        </nav>
    `;

    /* =============================
       TRIPLE-CLICK EASTER EGG LOGIC
       ============================= */

    const logoContainer = this.querySelector("#logoContainer");
    let clickCount = 0;
    let clickTimer = null;

    logoContainer.addEventListener("click", () => {
      clickCount++;

      // If 3 clicks happen before timeout → secret page
      if (clickCount === 3) {
        window.location.href = "./secret.html";
        clickCount = 0;
        return;
      }

      // Start/reset timer
      if (clickTimer) clearTimeout(clickTimer);

      clickTimer = setTimeout(() => {
        // If only 1 click → go to landing page
        if (clickCount === 1) {
          window.location.href = "./index.html";
        }

        // Reset click count
        clickCount = 0;
      }, 350); // <-- Click speed allowed (0.35s)
    });
  }
}

customElements.define("site-navbar", SiteHeader);
