class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
            <footer>
      <a id="mapIcon" href="./map.html">
        <img src="./images/maps.gif" alt="Map Icon" />
      </a>
      <a id="forumIcon" href="./forum-main.html">
        <img src="./images/forum.gif" alt="Forum Icon" />
      </a>
      <a id="profileIcon" href="./loginPage.html">
        <img src="./images/profile.gif" alt="Profile Icon" />
      </a>
    </footer>
        `;
  }
}

customElements.define("site-footer", SiteFooter);
