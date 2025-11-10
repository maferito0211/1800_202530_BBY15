class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
        <header>
        <div>
        </div>
        </header>
        `;
  }
}

customElements.define("site-header", SiteHeader);
