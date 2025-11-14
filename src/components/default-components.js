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
            <a  href="./secret.html" id="logoContainer">
              <img id="logo" src="./images/logoImg.png" alt="Site Logo" />
            </a>
          </div>
          <div id="pageTitleSection"></div>
          <div></div>
        </nav>
        `;
  }
}

customElements.define("site-navbar", SiteHeader);
